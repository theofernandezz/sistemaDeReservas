import { useState } from 'react'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { disconnectGoogleCalendar } from '@/app/actions'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

interface IntegrationsSectionProps {
  isGoogleConnected: boolean
}

export function IntegrationsSection({ isGoogleConnected }: IntegrationsSectionProps) {
  const [disconnecting, setDisconnecting] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const router = useRouter()

  const handleConnect = () => {
    window.location.href = '/api/auth/google'
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const result = await disconnectGoogleCalendar()
      if (result.success) {
        showSuccess('Desconectado', 'Google Calendar ha sido desvinculado')
        router.refresh()
      } else {
        showError('Error', result.error || 'No se pudo desconectar')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-5">
        <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-2.5 shadow-sm">
          <Image
            src="/integrations/google-calendar.svg"
            alt="Google Calendar"
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">Google Calendar</h3>
          <p className="text-sm font-medium text-muted-foreground/80 mt-1">
            Sincronizá citas automáticamente con tu calendario personal o de trabajo
          </p>
          <div className="mt-5 flex items-center gap-3">
            {isGoogleConnected ? (
              <>
                <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl shadow-inner">
                  <Check className="w-4 h-4" />
                  Conectado
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="rounded-xl border border-white/5 hover:bg-secondary/40 shadow-sm transition-all hover:text-destructive">
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />}
                  <span>Desconectar</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} className="rounded-xl px-5 hover:-translate-y-0.5 shadow transition-all duration-300">
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar con Google
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border/40">
        <div className="bg-secondary/20 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <h4 className="font-semibold tracking-tight text-[15px]">Próximamente</h4>
            <p className="text-sm font-medium text-muted-foreground/80 mt-1">
              Integraciones con WhatsApp Business, Microsoft Outlook y Zoom.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
