-- ============================================
-- Migration: Notifications System
-- Description: Create notifications table for centralized alert system
-- ============================================

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'appointment_created',
  'appointment_confirmed',
  'appointment_cancelled',
  'appointment_reminder',
  'payment_received',
  'payment_failed',
  'system'
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Notification content
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities (optional)
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Metadata for additional context
  metadata JSONB DEFAULT '{}',
  
  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX idx_notifications_business_id ON notifications(business_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(business_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(business_id, type);

-- RLS Policies
-- Business owners can view their notifications
CREATE POLICY "Business owners can view own notifications"
  ON notifications FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can update their notifications (mark as read)
CREATE POLICY "Business owners can update own notifications"
  ON notifications FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can delete their notifications
CREATE POLICY "Business owners can delete own notifications"
  ON notifications FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Service role can insert notifications (for backend triggers)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Helper function to create notifications
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_business_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_appointment_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    business_id,
    type,
    title,
    message,
    appointment_id,
    metadata
  ) VALUES (
    p_business_id,
    p_type,
    p_title,
    p_message,
    p_appointment_id,
    p_metadata
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: Auto-create notification on new appointment
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_service_name TEXT;
BEGIN
  -- Get service name
  SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
  
  -- Create notification
  PERFORM create_notification(
    NEW.business_id,
    'appointment_created',
    'Nueva reserva',
    format('%s ha reservado %s para el %s', 
      NEW.client_name, 
      v_service_name,
      to_char(NEW.start_time AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI')
    ),
    NEW.id,
    jsonb_build_object(
      'client_name', NEW.client_name,
      'client_email', NEW.client_email,
      'service_name', v_service_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_appointment();

-- ============================================
-- Trigger: Auto-create notification on appointment status change
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_service_name TEXT;
  v_notification_type notification_type;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only trigger if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get service name
  SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
  
  -- Determine notification based on new status
  CASE NEW.status
    WHEN 'confirmed' THEN
      v_notification_type := 'appointment_confirmed';
      v_title := 'Reserva confirmada';
      v_message := format('La reserva de %s para %s ha sido confirmada', NEW.client_name, v_service_name);
    WHEN 'cancelled' THEN
      v_notification_type := 'appointment_cancelled';
      v_title := 'Reserva cancelada';
      v_message := format('%s ha cancelado su reserva de %s', NEW.client_name, v_service_name);
    ELSE
      RETURN NEW; -- Don't notify for other status changes
  END CASE;
  
  -- Create notification
  PERFORM create_notification(
    NEW.business_id,
    v_notification_type,
    v_title,
    v_message,
    NEW.id,
    jsonb_build_object(
      'client_name', NEW.client_name,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_appointment_status_change();
