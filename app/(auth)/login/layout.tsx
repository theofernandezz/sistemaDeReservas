import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ingresar',
  description: 'Accede a tu cuenta de Buki para gestionar tus reservas, horarios y pagos.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
