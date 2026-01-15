-- Migration: Add team_members table for multi-staff businesses
-- This allows businesses to have multiple team members with individual schedules

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text, -- e.g., "Estilista Senior", "Barbero", "Colorista"
  avatar_color text DEFAULT 'bg-primary', -- Tailwind class for avatar background
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Individual schedule settings
  slot_interval integer NOT NULL DEFAULT 15, -- minutes between slots
  buffer_time integer NOT NULL DEFAULT 5, -- extra time between appointments
  
  -- Weekly schedule (stored as JSONB for flexibility)
  -- Format: { dayOfWeek: { isOpen, startTime, endTime, breaks: [{name, start, end}] } }
  weekly_schedule jsonb NOT NULL DEFAULT '{
    "0": {"isOpen": false, "startTime": "10:00", "endTime": "14:00", "breaks": []},
    "1": {"isOpen": true, "startTime": "09:00", "endTime": "18:00", "breaks": [{"name": "Almuerzo", "start": "13:00", "end": "14:00"}]},
    "2": {"isOpen": true, "startTime": "09:00", "endTime": "18:00", "breaks": [{"name": "Almuerzo", "start": "13:00", "end": "14:00"}]},
    "3": {"isOpen": true, "startTime": "09:00", "endTime": "18:00", "breaks": [{"name": "Almuerzo", "start": "13:00", "end": "14:00"}]},
    "4": {"isOpen": true, "startTime": "09:00", "endTime": "18:00", "breaks": [{"name": "Almuerzo", "start": "13:00", "end": "14:00"}]},
    "5": {"isOpen": true, "startTime": "09:00", "endTime": "18:00", "breaks": [{"name": "Almuerzo", "start": "13:00", "end": "14:00"}]},
    "6": {"isOpen": true, "startTime": "10:00", "endTime": "14:00", "breaks": []}
  }'::jsonb,
  
  CONSTRAINT team_members_pkey PRIMARY KEY (id)
);

-- Add business_id to blocked_slots if not exists (for team member specific blocks)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'blocked_slots' AND column_name = 'team_member_id') THEN
    ALTER TABLE public.blocked_slots 
    ADD COLUMN team_member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add team_member_id to appointments for multi-staff scheduling
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'team_member_id') THEN
    ALTER TABLE public.appointments 
    ADD COLUMN team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_business_id ON public.team_members(business_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON public.team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_team_member_id ON public.blocked_slots(team_member_id);
CREATE INDEX IF NOT EXISTS idx_appointments_team_member_id ON public.appointments(team_member_id);

-- RLS Policies for team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their team members
CREATE POLICY "Business owners can manage team members" ON public.team_members
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Public read for booking pages (only active members)
CREATE POLICY "Public can view active team members" ON public.team_members
  FOR SELECT
  USING (is_active = true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_team_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;
CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.team_members IS 'Team members/staff for each business with individual schedules';
COMMENT ON COLUMN public.team_members.weekly_schedule IS 'JSONB storing weekly schedule per day with breaks support';
COMMENT ON COLUMN public.team_members.slot_interval IS 'Minutes between available time slots';
COMMENT ON COLUMN public.team_members.buffer_time IS 'Extra minutes between appointments for cleanup/prep';
