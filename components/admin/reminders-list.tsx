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
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
          <CalendarCheck className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Todo al día</h3>
        <p className="text-sm text-muted-foreground">
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
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-foreground">
              Reservas Pendientes de Confirmación
            </h2>
            <span className="ml-auto text-sm text-muted-foreground">
              {pendingAppointments.length} {pendingAppointments.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          <div className="bg-card border border-amber-500/20 rounded-2xl overflow-hidden">
            <div className="divide-y divide-border">
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
                  <div key={apt.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Date/Time */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="text-center min-w-16">
                        <p className="text-sm font-semibold text-foreground">
                          {format(startTime, 'HH:mm')}
                        </p>
                        <p className={cn(
                          "text-xs capitalize",
                          isToday ? "text-amber-500 font-medium" :
                            isTomorrow ? "text-primary font-medium" :
                              "text-muted-foreground"
                        )}>
                          {isToday ? 'Hoy' : isTomorrow ? 'Mañana' : format(startTime, 'EEE d', { locale: es })}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="w-1 h-12 bg-amber-500/30 rounded-full" />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {apt.client_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {apt.service?.name || 'Servicio'}
                        </p>
                        {apt.client_phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone size={12} />
                            {apt.client_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      {/* Message Button */}
                      {hasPhone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePendingMessage(apt)}
                          className="gap-1.5 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-600 dark:text-green-400 dark:hover:text-green-400"
                        >
                          <MessageCircle size={14} />
                          <span className="hidden sm:inline">Mensaje</span>
                        </Button>
                      )}

                      {/* Confirm Button */}
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(apt)}
                        disabled={loadingAction === `confirm-${apt.id}`}
                        className="gap-1.5 bg-primary hover:bg-primary/90"
                      >
                        {loadingAction === `confirm-${apt.id}` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        <span className="hidden sm:inline">Confirmar</span>
                      </Button>

                      {/* Reject Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(apt)}
                        disabled={loadingAction === `reject-${apt.id}`}
                        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {loadingAction === `reject-${apt.id}` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                        <span className="hidden sm:inline">Rechazar</span>
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
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Recordatorios para Mañana
            </h2>
            <span className="text-sm text-muted-foreground ml-2 capitalize">
              {tomorrowFormatted}
            </span>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{tomorrowAppointments.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{emailsSent}</p>
                  <p className="text-xs text-muted-foreground">Emails</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{whatsappSent}</p>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {tomorrowAppointments.length - whatsappSent}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MessageCircle size={18} className="text-primary" />
                Turnos pendientes de recordatorio
              </h3>
            </div>

            <div className="divide-y divide-border">
              {tomorrowAppointments.map(apt => {
                const startTime = new Date(apt.start_time)
                const hasEmail = !!apt.client_email
                const hasPhone = !!apt.client_phone

                return (
                  <div key={apt.id} className="p-4 flex items-center gap-4">
                    {/* Time */}
                    <div className="text-center min-w-15">
                      <p className="text-sm font-semibold text-foreground">
                        {format(startTime, 'HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {format(startTime, 'EEEE', { locale: es })}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="w-1 h-12 bg-primary/20 rounded-full" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {apt.client_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.service?.name || 'Servicio'}
                      </p>
                      {apt.client_phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone size={12} />
                          {apt.client_phone}
                        </p>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="hidden sm:flex flex-col gap-1">
                      {/* Email Status */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${apt.email_reminder_sent
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : hasEmail
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-secondary text-muted-foreground'
                        }`}>
                        {apt.email_reminder_sent ? (
                          <><CheckCircle2 size={12} /> Email</>
                        ) : hasEmail ? (
                          <><Clock size={12} /> Email</>
                        ) : (
                          <><Circle size={12} /> Sin email</>
                        )}
                      </span>

                      {/* WhatsApp Status */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${apt.whatsapp_reminder_sent
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : hasPhone
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-secondary text-muted-foreground'
                        }`}>
                        {apt.whatsapp_reminder_sent ? (
                          <><CheckCircle2 size={12} /> WPP</>
                        ) : hasPhone ? (
                          <><Circle size={12} /> WPP</>
                        ) : (
                          <><Circle size={12} /> Sin tel</>
                        )}
                      </span>
                    </div>

                    {/* Action Button */}
                    {hasPhone && !apt.whatsapp_reminder_sent ? (
                      <Button
                        size="sm"
                        onClick={() => handleWhatsAppClick(apt)}
                        disabled={loadingWhatsApp === apt.id}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5 shadow-lg shadow-green-600/25"
                      >
                        {loadingWhatsApp === apt.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <MessageCircle size={14} />
                            <span className="hidden sm:inline">Enviar</span>
                            <ExternalLink size={12} />
                          </>
                        )}
                      </Button>
                    ) : apt.whatsapp_reminder_sent ? (
                      <span className="flex items-center gap-1 text-emerald-500 text-sm px-3">
                        <Check size={14} />
                        Enviado
                      </span>
                    ) : null}
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
