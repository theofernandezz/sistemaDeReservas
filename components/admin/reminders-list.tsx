'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MessageCircle,
  Check,
  Clock,
  Phone,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Circle,
  Mail,
  CalendarCheck,
  X,
  Calendar
} from 'lucide-react'
import {
  AppointmentWithReminders,
  markWhatsAppSent,
  updateAppointmentStatus
} from '@/app/actions'
import { AppointmentWithService } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Generate WhatsApp deep link with pre-filled message
 */
function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, '')
  const internationalPhone = cleanPhone.startsWith('0')
    ? `54${cleanPhone.slice(1)}`
    : cleanPhone.startsWith('+')
      ? cleanPhone.slice(1)
      : cleanPhone

  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`
}

interface RemindersListProps {
  pendingAppointments: AppointmentWithService[]
  tomorrowAppointments: AppointmentWithReminders[]
  tomorrowFormatted: string
}

export default function RemindersList({
  pendingAppointments,
  tomorrowAppointments,
  tomorrowFormatted
}: RemindersListProps) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [loadingWhatsApp, setLoadingWhatsApp] = useState<string | null>(null)

  // Calculate stats for tomorrow's reminders
  const emailsSent = tomorrowAppointments.filter(a => a.email_reminder_sent).length
  const whatsappSent = tomorrowAppointments.filter(a => a.whatsapp_reminder_sent).length

  // Handle pending appointment actions
  const handleConfirm = async (apt: AppointmentWithService) => {
    setLoadingAction(`confirm-${apt.id}`)
    await updateAppointmentStatus(apt.id, 'confirmed')
    router.refresh()
    setLoadingAction(null)
  }

  const handleReject = async (apt: AppointmentWithService) => {
    setLoadingAction(`reject-${apt.id}`)
    await updateAppointmentStatus(apt.id, 'cancelled')
    router.refresh()
    setLoadingAction(null)
  }

  const handlePendingMessage = (apt: AppointmentWithService) => {
    if (!apt.client_phone) return

    const startTime = new Date(apt.start_time)
    const serviceName = apt.service?.name || 'tu turno'

    const message = `Hola ${apt.client_name}! 👋

Recibimos tu solicitud de reserva:

📅 ${format(startTime, "EEEE d 'de' MMMM", { locale: es })}
⏰ ${format(startTime, 'HH:mm')} hs
💅 ${serviceName}

Te confirmamos en breve! ✨`

    const whatsappUrl = generateWhatsAppLink(apt.client_phone, message)
    window.open(whatsappUrl, '_blank')
  }

  // Handle WhatsApp reminder
  const handleWhatsAppClick = async (apt: AppointmentWithReminders) => {
    if (!apt.client_phone) return

    const startTime = new Date(apt.start_time)
    const serviceName = apt.service?.name || 'tu turno'

    const message = `Hola ${apt.client_name}! 👋

Te recordamos que mañana tenés turno:

📅 ${format(startTime, "EEEE d 'de' MMMM", { locale: es })}
⏰ ${format(startTime, 'HH:mm')} hs
💅 ${serviceName}

Te esperamos! ✨

Si necesitás cancelar, avisame por acá.`

    const whatsappUrl = generateWhatsAppLink(apt.client_phone, message)
    window.open(whatsappUrl, '_blank')

    setLoadingWhatsApp(apt.id)
    await markWhatsAppSent(apt.id)
    router.refresh()
    setLoadingWhatsApp(null)
  }

  const hasNoPending = pendingAppointments.length === 0
  const hasNoTomorrow = tomorrowAppointments.length === 0

  if (hasNoPending && hasNoTomorrow) {
    return (
      <div className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-3xl p-10 text-center shadow-sm max-w-lg mx-auto mt-8">
        <div className="h-16 w-16 rounded-full bg-secondary/50 border border-border/50 mx-auto mb-4 flex items-center justify-center shadow-inner">
          <CalendarCheck className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <h3 className="text-xl font-semibold text-foreground tracking-tight mb-2">Todo al día</h3>
        <p className="text-sm text-muted-foreground/80">
          No hay reservas pendientes ni recordatorios por enviar
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ========================================== */}
      {/* Pending Bookings Section */}
      {/* ========================================== */}
      {pendingAppointments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></span>
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Reservas Pendientes
              </h2>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {pendingAppointments.length} {pendingAppointments.length === 1 ? 'solicitud' : 'solicitudes'}
            </span>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-border/40">
              {pendingAppointments.map(apt => {
                const startTime = new Date(apt.start_time)
                const hasPhone = !!apt.client_phone
                const isToday = new Date().toDateString() === startTime.toDateString()
                const isTomorrow = (() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  return tomorrow.toDateString() === startTime.toDateString()
                })()

                return (
                  <div key={apt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-secondary/20 transition-colors duration-200 group">
                    {/* Date/Time */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="text-center min-w-[4.5rem] bg-background/50 py-2 rounded-xl border border-border/50 shadow-sm group-hover:border-primary/20 transition-colors">
                        <p className="text-sm font-semibold text-foreground tracking-tight">
                          {format(startTime, 'HH:mm')}
                        </p>
                        <p className={cn(
                          "text-[11px] font-medium uppercase tracking-wider mt-0.5",
                          isToday ? "text-amber-500" :
                            isTomorrow ? "text-primary" :
                              "text-muted-foreground/80"
                        )}>
                          {isToday ? 'Hoy' : isTomorrow ? 'Mañ' : format(startTime, 'MMM d', { locale: es })}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pl-2 border-l-[3px] border-amber-500/50 py-0.5 rounded-sm">
                        <p className="font-semibold text-foreground truncate text-[15px] tracking-tight">
                          {apt.client_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                          {apt.service?.name || 'Servicio'}
                        </p>
                        {apt.client_phone && (
                          <p className="text-[13px] text-muted-foreground/70 flex items-center gap-1.5 mt-1">
                            <Phone size={12} className="opacity-70" />
                            {apt.client_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 pt-2 sm:pt-0">
                      {/* Message Button */}
                      {hasPhone && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePendingMessage(apt)}
                          className="h-9 px-3 gap-1.5 text-green-600 dark:text-green-500 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 font-medium"
                        >
                          <MessageCircle size={15} />
                          <span className="hidden sm:inline">Consultar</span>
                        </Button>
                      )}

                      {/* Reject Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(apt)}
                        disabled={loadingAction === `reject-${apt.id}`}
                        className="h-9 w-9 px-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Rechazar"
                      >
                        {loadingAction === `reject-${apt.id}` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <X size={18} />
                        )}
                      </Button>

                      {/* Confirm Button */}
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(apt)}
                        disabled={loadingAction === `confirm-${apt.id}`}
                        className="h-9 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                      >
                        {loadingAction === `confirm-${apt.id}` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} strokeWidth={2.5} />
                        )}
                        <span className="font-medium">Confirmar</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* Tomorrow's Reminders Section */}
      {/* ========================================== */}
      {tomorrowAppointments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <Calendar size={20} className="text-primary" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Recordatorios para {tomorrowFormatted}
              </h2>
            </div>
          </div>

          {/* Stats Cards (Glassmorphic) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3.5 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">Total</p>
              </div>
              <p className="text-3xl font-bold text-foreground pl-1">{tomorrowAppointments.length}</p>
            </div>

            <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3.5 mb-2">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Mail className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">Emails</p>
              </div>
              <p className="text-3xl font-bold text-foreground pl-1">{emailsSent}</p>
            </div>

            <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3.5 mb-2">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">WhatsApps</p>
              </div>
              <p className="text-3xl font-bold text-foreground pl-1">{whatsappSent}</p>
            </div>

            <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3.5 mb-2">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">Faltan</p>
              </div>
              <p className="text-3xl font-bold text-foreground pl-1">
                {tomorrowAppointments.length - whatsappSent}
              </p>
            </div>
          </div>

          {/* Appointments List (Glassmorphic Inbox) */}
          <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-border/30 bg-secondary/10">
              <h3 className="font-semibold text-foreground tracking-tight flex items-center gap-2.5">
                <MessageCircle size={18} className="text-primary" />
                Recordatorios por enviar
              </h3>
            </div>

            <div className="divide-y divide-border/40">
              {tomorrowAppointments.map(apt => {
                const startTime = new Date(apt.start_time)
                const hasEmail = !!apt.client_email
                const hasPhone = !!apt.client_phone

                return (
                  <div key={apt.id} className="p-4 sm:p-5 flex items-center gap-4 hover:bg-secondary/20 transition-colors duration-200 group">
                    {/* Time */}
                    <div className="text-center min-w-[4.5rem] bg-background/50 py-2 rounded-xl border border-border/50 shadow-sm">
                      <p className="text-sm font-semibold text-foreground tracking-tight">
                        {format(startTime, 'HH:mm')}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pl-2 border-l-[3px] border-primary/40 py-0.5 rounded-sm">
                      <p className="font-semibold text-foreground truncate text-[15px] tracking-tight">
                        {apt.client_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                        {apt.service?.name || 'Servicio'}
                      </p>
                    </div>

                    {/* Status Badges */}
                    <div className="hidden sm:flex flex-col gap-1.5 px-4 w-32 shrink-0">
                      {/* Email Status */}
                      <span className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5 border ${apt.email_reminder_sent
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : hasEmail
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-secondary/50 text-muted-foreground border-border/50'
                        }`}>
                        {apt.email_reminder_sent ? (
                          <><CheckCircle2 size={13} strokeWidth={2.5} /> Email</>
                        ) : hasEmail ? (
                          <><Clock size={13} strokeWidth={2.5} /> Email</>
                        ) : (
                          <><Circle size={13} strokeWidth={2.5} /> -Email</>
                        )}
                      </span>

                      {/* WhatsApp Status */}
                      <span className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5 border ${apt.whatsapp_reminder_sent
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : hasPhone
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-secondary/50 text-muted-foreground border-border/50'
                        }`}>
                        {apt.whatsapp_reminder_sent ? (
                          <><CheckCircle2 size={13} strokeWidth={2.5} /> WPP</>
                        ) : hasPhone ? (
                          <><Circle size={13} strokeWidth={2.5} /> WPP</>
                        ) : (
                          <><Circle size={13} strokeWidth={2.5} /> -WPP</>
                        )}
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {hasPhone && !apt.whatsapp_reminder_sent ? (
                        <Button
                          size="sm"
                          onClick={() => handleWhatsAppClick(apt)}
                          disabled={loadingWhatsApp === apt.id}
                          className="h-9 px-4 bg-green-600/90 hover:bg-green-600 text-white gap-2 shadow-sm hover:shadow-md hover:shadow-green-600/20 hover:-translate-y-0.5 transition-all"
                        >
                          {loadingWhatsApp === apt.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <MessageCircle size={16} />
                              <span className="hidden sm:inline font-medium">WhatsApp</span>
                            </>
                          )}
                        </Button>
                      ) : apt.whatsapp_reminder_sent ? (
                        <div className="h-9 px-4 flex items-center justify-center gap-1.5 text-emerald-500 font-medium text-sm bg-emerald-500/5 rounded-md border border-emerald-500/10">
                          <Check size={16} strokeWidth={2.5} />
                          Enviado
                        </div>
                      ) : (
                        <div className="h-9 px-4 flex items-center justify-center text-muted-foreground text-sm opacity-50">
                          Sin info
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
