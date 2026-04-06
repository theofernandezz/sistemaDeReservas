import {
  Bell,
  Building2,
  CalendarClock,
  CreditCard,
  Palette,
  Phone,
  Plug2,
  User,
} from 'lucide-react'
import type { Section } from './settings-types'

export const sections: Section[] = [
  {
    id: 'profile',
    label: 'Perfil',
    icon: <Building2 size={18} />,
    description: 'Nombre, logo y descripción',
  },
  {
    id: 'contact',
    label: 'Contacto',
    icon: <Phone size={18} />,
    description: 'Teléfono, email y redes',
  },
  {
    id: 'appearance',
    label: 'Apariencia',
    icon: <Palette size={18} />,
    description: 'Color de tu marca',
  },
  {
    id: 'reservations',
    label: 'Reservas',
    icon: <CalendarClock size={18} />,
    description: 'Anticipación y cancelaciones',
  },
  {
    id: 'payments',
    label: 'Pagos',
    icon: <CreditCard size={18} />,
    description: 'MercadoPago, señas y transferencia',
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    icon: <Plug2 size={18} />,
    description: 'Google Calendar',
  },
  {
    id: 'notifications',
    label: 'Notificaciones',
    icon: <Bell size={18} />,
    description: 'Emails y recordatorios',
  },
  {
    id: 'account',
    label: 'Cuenta',
    icon: <User size={18} />,
    description: 'Contraseña y acceso',
  },
]
