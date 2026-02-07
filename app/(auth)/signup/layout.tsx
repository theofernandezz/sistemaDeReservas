import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crear Cuenta',
  description: 'Crea tu cuenta gratis en Buki y comienza a automatizar tus reservas en menos de 2 minutos.',
  openGraph: {
    title: 'Crear Cuenta - Buki',
    description: 'Setup en menos de 2 minutos. Comienza gratis.',
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
