import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // Redirigir a servicios por defecto
  redirect('/dashboard/services')
}
