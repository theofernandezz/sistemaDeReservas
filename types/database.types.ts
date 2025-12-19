// ============================================
// Database Table Types (matching Supabase schema)
// ============================================

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  description: string | null;
  image: string | null;
}

export interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
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
}

export interface BlockedSlot {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
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

export interface CreateServiceInput {
  name: string;
  duration_minutes: number;
  price: number;
  is_active?: boolean;
}

export interface UpdateServiceInput {
  name?: string;
  duration_minutes?: number;
  price?: number;
  is_active?: boolean;
}

export interface CreateAppointmentInput {
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  status?: string;
  service_id: string;
  addons?: SelectedAddon[];
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

export interface ServerActionResponse<T = any> {
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
  reason?: string; // If unavailable, why (e.g., "booked", "blocked")
}

