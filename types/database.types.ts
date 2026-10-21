// ============================================
// Database Table Types (matching Supabase schema)
// ============================================

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  settings: BusinessSettings;
  deposit_percentage: number;
  // Email configuration fields
  email_from: string | null;
  email_from_name: string | null;
  admin_notification_email: string | null;
  email_brand_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  // Horarios de atención
  businessHours?: {
    dayOfWeek: number;
    isOpen: boolean;
    startTime: string;
    endTime: string;
    breaks?: { name: string; start: string; end: string }[];
  }[];
  slotInterval?: number;
  bufferTime?: number;
  // Configuración de reservas
  minAdvanceHours?: number;
  maxAdvanceDays?: number;
  cancellationHours?: number;
  rescheduleHours?: number;
  // Notificaciones
  notificationEmail?: string;
  // Branding
  primaryColor?: string;
  accentColor?: string;
  // Payments
  paymentFlowMode?: 'mercadopago' | 'manual_transfer';
  manualTransfer?: {
    enabled?: boolean;
    alias?: string;
    cvu?: string;
    accountHolder?: string;
    message?: string;
  };
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  description: string | null;
  image: string | null;
  business_id: string;
}

export interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  business_id: string;
}

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface Appointment {
  id: string;
  created_at: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  status: string;
  service_id: string;
  addons: SelectedAddon[];
  business_id: string;
  // Reminder tracking fields
  email_reminder_sent: boolean;
  email_reminder_sent_at: string | null;
  whatsapp_reminder_sent: boolean;
  whatsapp_reminder_sent_at: string | null;
  // Reschedule tracking fields
  rescheduled_from: string | null;
  reschedule_count: number;
  last_rescheduled_at: string | null;
  google_event_id: string | null;
  team_member_id: string | null;
  // Payment proof fields
  proof_url: string | null;
  proof_uploaded_at: string | null;
  proof_expires_at: string | null;
  proof_auto_approve_at: string | null;
  proof_rejection_reason: string | null;
  payment_status: string | null;
  payment_amount: number | null;
}

export interface BlockedSlot {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
  business_id: string;
}

// ============================================
// Relationship Types
// ============================================

export interface AppointmentWithService extends Appointment {
  service: Service;
}


// ============================================
// Input Types for CRUD Operations
// ============================================

export interface UpdateBusinessInput {
  name?: string;
  slug?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  address?: string | null;
  logo?: string | null;
  settings?: Partial<BusinessSettings>;
}

export interface CreateServiceInput {
  name: string;
  duration_minutes: number;
  price: number;
  description?: string | null;
  image?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateServiceInput {
  name?: string;
  duration_minutes?: number;
  price?: number;
  description?: string | null;
  image?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface CreateAppointmentInput {
  start_time: string;
  /** Ignored by the server: end_time is computed from DB durations */
  end_time?: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  status?: string;
  payment_status?: 'pending' | 'pending_confirmation' | 'paid' | 'rejected' | null;
  service_id: string;
  addon_ids?: string[];
  team_member_id?: string | null;
}

export interface UpdateAppointmentInput {
  start_time?: string;
  end_time?: string;
  client_name?: string;
  client_phone?: string | null;
  client_email?: string | null;
  status?: string;
}

export interface CreateServiceAddonInput {
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  is_active?: boolean;
}

export interface UpdateServiceAddonInput {
  name?: string;
  description?: string | null;
  price?: number;
  duration_minutes?: number;
  is_active?: boolean;
}

export interface CreateBlockedSlotInput {
  start_time: string;
  end_time: string;
  reason?: string | null;
}

export interface UpdateBlockedSlotInput {
  start_time?: string;
  end_time?: string;
  reason?: string | null;
}

// ============================================
// Enum Types
// ============================================

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

// ============================================
// Server Action Response Types
// ============================================

export interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Filter Types
// ============================================

export interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  serviceId?: string;
}

// ============================================
// Available Slots Types
// ============================================

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string; // If unavailable, why (e.g., "booked", "blocked", "past")
}

// ============================================
// Team Member Types
// ============================================

export interface DayBreak {
  name: string;
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface DaySchedule {
  isOpen: boolean;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  breaks: DayBreak[];
}

export interface WeeklySchedule {
  [dayOfWeek: string]: DaySchedule; // "0" = Sunday, "1" = Monday, etc.
}

export interface TeamMember {
  id: string;
  business_id: string;
  name: string;
  role: string | null;
  avatar_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  slot_interval: number;
  buffer_time: number;
  weekly_schedule: WeeklySchedule;
}

export interface CreateTeamMemberInput {
  name: string;
  role?: string | null;
  avatar_color?: string;
  is_active?: boolean;
  slot_interval?: number;
  buffer_time?: number;
  weekly_schedule?: WeeklySchedule;
}

export interface UpdateTeamMemberInput {
  name?: string;
  role?: string | null;
  avatar_color?: string;
  is_active?: boolean;
  slot_interval?: number;
  buffer_time?: number;
  weekly_schedule?: WeeklySchedule;
}

// Helper type for availability stats
export interface TeamMemberStats {
  activeDays: number;
  slotsPerDay: number;
  weeklyCapacity: number;
  weeklyHours: number;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'payment_received'
  | 'payment_failed'
  | 'system';

export interface Notification {
  id: string;
  business_id: string;
  type: NotificationType;
  title: string;
  message: string;
  appointment_id: string | null;
  metadata: NotificationMetadata;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationMetadata {
  client_name?: string;
  client_email?: string;
  service_name?: string;
  old_status?: string;
  new_status?: string;
  [key: string]: unknown;
}

export interface NotificationFilters {
  type?: NotificationType;
  is_read?: boolean;
  limit?: number;
  offset?: number;
}
