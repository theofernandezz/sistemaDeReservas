import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Configurar tu negocio',
  description: 'Completá la configuración de tu negocio para empezar a recibir reservas online.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
