import { notFound } from 'next/navigation'
import { Clock, CheckCircle2, XCircle, AlertCircle, Ban } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getPublicAppointmentWithProof } from '@/app/actions/proof'
import { TransferDetailsCard } from '@/components/booking/transfer-details-card'
import { ProofUploadCard } from '@/components/booking/proof-upload-card'
import { BusinessSettings } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface ReservaPageProps {
  params: Promise<{ id: string }>
}

export default async function ReservaPage({ params }: ReservaPageProps) {
  const { id } = await params

  const result = await getPublicAppointmentWithProof(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const appointment = result.data
  const startDate = new Date(appointment.start_time)
  const endDate = new Date(appointment.end_time)
  const paymentStatus = appointment.payment_status
  const isCancelled = appointment.status === 'cancelled'

  const settings = appointment.business?.settings as BusinessSettings | undefined
  const isManualTransfer =
    settings?.paymentFlowMode === 'manual_transfer' && settings?.manualTransfer?.enabled

  const depositPercentage = appointment.business?.deposit_percentage ?? 100
  const totalAmount = appointment.service?.price ?? 0
  const depositAmount = Math.round(totalAmount * (depositPercentage / 100))

  if (isCancelled) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col items-center justify-center p-4">
        <Card className="max-w-xl w-full border border-border/40 shadow-2xl shadow-black/5 bg-card/60 backdrop-blur-xl rounded-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <CardContent className="pt-8 pb-8 px-6 sm:px-10 space-y-5 text-center">
            <div className="relative mx-auto w-20 h-20">
              <div className="relative flex items-center justify-center w-full h-full rounded-full shadow-inner bg-red-100 dark:bg-red-900/30">
                <Ban className="w-10 h-10 text-red-600 dark:text-red-400" strokeWidth={1.5} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tighter">Turno cancelado</h1>
              <p className="text-muted-foreground text-sm">
                Este turno fue cancelado y ya no acepta comprobantes de pago.
                Si querés reservar nuevamente podés hacerlo desde el sitio del negocio.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      iconClass: 'text-yellow-600 dark:text-yellow-400',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
      label: 'Pago pendiente',
      description: 'Tu turno está reservado. Completá el pago para confirmarlo.',
    },
    pending_confirmation: {
      icon: Clock,
      iconClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      label: 'Comprobante recibido',
      description: 'El negocio está revisando tu comprobante.',
    },
    paid: {
      icon: CheckCircle2,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
      label: 'Turno confirmado',
      description: 'Tu pago fue aprobado y el turno está confirmado.',
    },
    rejected: {
      icon: XCircle,
      iconClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      label: 'Comprobante rechazado',
      description: 'El comprobante no fue aceptado. Por favor, subí uno nuevo.',
    },
  } as const

  const status = (paymentStatus as keyof typeof statusConfig) ?? 'pending'
  const config = statusConfig[status] ?? statusConfig.pending
  const StatusIcon = config.icon

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col items-center justify-center p-4">
      <Card className="max-w-xl w-full border border-border/40 shadow-2xl shadow-black/5 bg-card/60 backdrop-blur-xl rounded-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <CardContent className="pt-8 pb-8 px-6 sm:px-10 space-y-5">

          {/* Status icon */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-20 h-20 animate-in zoom-in duration-500 delay-150 fill-mode-both">
              <div className={cn('relative flex items-center justify-center w-full h-full rounded-full shadow-inner', config.bgClass)}>
                <StatusIcon className={cn('w-10 h-10', config.iconClass)} strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
              {appointment.business?.name && (
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {appointment.business.name}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-balance leading-tight">
                {config.label}
              </h1>
              <p className="text-muted-foreground text-sm">{config.description}</p>
            </div>
          </div>

          {/* Appointment summary */}
          <div className="bg-secondary/30 border border-border/50 rounded-2xl p-5 text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
            <h3 className="font-semibold text-lg">{appointment.service?.name ?? 'Turno'}</h3>
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium text-foreground">
                  {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hora</span>
                <span className="font-medium text-foreground">
                  {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')} hs
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium text-foreground">{appointment.client_name}</span>
              </div>
              {totalAmount > 0 && (
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="text-muted-foreground font-medium">Total</span>
                  <span className="font-bold text-primary">
                    ${new Intl.NumberFormat('es-AR').format(totalAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* State-specific content */}
          {paymentStatus === 'pending' && isManualTransfer && settings?.manualTransfer && (
            <>
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-600 fill-mode-both">
                <TransferDetailsCard
                  alias={settings.manualTransfer.alias || null}
                  cvu={settings.manualTransfer.cvu || null}
                  accountHolder={settings.manualTransfer.accountHolder || null}
                  message={null}
                  totalAmount={totalAmount}
                  depositAmount={depositAmount}
                  depositPercentage={depositPercentage}
                />
              </div>
              <div className="animate-in fade-in-from-bottom-2 duration-500 delay-700 fill-mode-both">
                <ProofUploadCard
                  appointmentId={appointment.id}
                  currentProofUrl={appointment.proof_url}
                />
              </div>
            </>
          )}

          {paymentStatus === 'pending_confirmation' && (
            <div className="animate-in fade-in duration-500 delay-600 fill-mode-both space-y-3">
              <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Recibimos tu comprobante y lo estamos revisando. Te avisamos cuando esté confirmado.
                </p>
              </div>
              {appointment.proof_url && (
                <a
                  href={appointment.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Ver comprobante enviado
                </a>
              )}
            </div>
          )}

          {paymentStatus === 'rejected' && (
            <div className="animate-in fade-in duration-500 delay-600 fill-mode-both space-y-4">
              {appointment.proof_rejection_reason && (
                <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400 mb-1">
                    Motivo del rechazo
                  </p>
                  <p className="text-sm text-red-900 dark:text-red-100">
                    {appointment.proof_rejection_reason}
                  </p>
                </div>
              )}
              <ProofUploadCard
                appointmentId={appointment.id}
                currentProofUrl={null}
              />
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
