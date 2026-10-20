import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import ResendLinkButton from './resend-link-button'

export const metadata: Metadata = {
  title: 'Gestionar turno',
  description: 'Pedí un link nuevo para gestionar tu turno.',
  robots: {
    index: false,
    follow: false,
  },
}

// This page never loads appointment data: the id in the URL is not a credential anymore.
export default async function CancelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-5xl mx-auto flex h-16 items-center px-4 sm:px-6">
          <span className="font-serif font-bold tracking-tight text-xl">Reservas</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <Card className="border-border/50 shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-bold tracking-tight">Cambiamos los links de tus turnos</h1>
              <p className="text-muted-foreground">
                Por seguridad, ahora cada turno tiene un link personal y privado para reprogramarlo o cancelarlo.
                Te enviamos el link nuevo por mail al email con el que hiciste la reserva.
              </p>
            </div>
            <ResendLinkButton appointmentId={id} />
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </Card>
        </div>
      </main>
    </div>
  )
}
