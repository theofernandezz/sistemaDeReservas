// Frontend types - Compatible with luxenail components
export interface FrontendService {
  id: string;
  title: string;
  durationMin: number;
  price: number;
  description: string;
  image?: string;
  active?: boolean;
}

export interface FrontendTimeSlot {
  time: string;
  available: boolean;
}

export interface FrontendBookingDetails {
  service: FrontendService | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

export enum AppStep {
  MENU = 'MENU',
  CALENDAR = 'CALENDAR',
  CONFIRMATION = 'CONFIRMATION',
  SUCCESS = 'SUCCESS'
}

export enum AdminView {
  SERVICES = 'SERVICES',
  AVAILABILITY = 'AVAILABILITY',
  APPOINTMENTS = 'APPOINTMENTS'
}
