import type { Metadata } from 'next'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

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
    <ConfirmProvider>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </ConfirmProvider>
  )
}
