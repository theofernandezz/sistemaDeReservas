'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MessageCircle,
  Check,
  Phone,
  ExternalLink,
  Loader2,
  Calendar,
  Filter,
  Smartphone
} from 'lucide-react'
import {
  AppointmentWithReminders,
  markWhatsAppSent,
  getAppointmentsForWhatsApp,
  WhatsAppDateFilter,
  WhatsAppStatusFilter
} from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

/**
 * Generate reminder message for appointment
 */
function generateReminderMessage(apt: AppointmentWithReminders): string {
  const startTime = new Date(apt.start_time)
  const serviceName = apt.service?.name || 'tu turno'

  return `Hola ${apt.client_name}! 👋

Te recordamos tu turno:

📅 ${format(startTime, "EEEE d 'de' MMMM", { locale: es })}
⏰ ${format(startTime, 'HH:mm')} hs
💅 ${serviceName}

Te esperamos! ✨

Si necesitás cancelar o reprogramar, avisame por acá.`
}

const DATE_FILTER_OPTIONS: { value: WhatsAppDateFilter; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'week', label: 'Esta Semana' },
]

const STATUS_FILTER_OPTIONS: { value: WhatsAppStatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'sent', label: 'Enviados' },
  { value: 'all', label: 'Todos' },
]

export default function WhatsAppRemindersPanel() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<AppointmentWithReminders[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<WhatsAppDateFilter>('tomorrow')
  const [statusFilter, setStatusFilter] = useState<WhatsAppStatusFilter>('pending')

  // Fetch appointments when filters change
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    const result = await getAppointmentsForWhatsApp({
      dateRange: dateFilter,
      status: statusFilter
    })
    if (result.success && result.data) {
      setAppointments(result.data)
    }
    setLoading(false)
  }, [dateFilter, statusFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAppointments()
  }, [fetchAppointments])

  // Handle WhatsApp click
  const handleWhatsAppClick = async (apt: AppointmentWithReminders) => {
    if (!apt.client_phone) return

    const message = generateReminderMessage(apt)
    const whatsappUrl = generateWhatsAppLink(apt.client_phone, message)
    window.open(whatsappUrl, '_blank')

    setSendingId(apt.id)
    await markWhatsAppSent(apt.id)

    // Update local state immediately
    setAppointments(prev =>
      prev.map(a => a.id === apt.id
        ? { ...a, whatsapp_reminder_sent: true, whatsapp_reminder_sent_at: new Date().toISOString() }
        : a
      )
    )
    setSendingId(null)
    router.refresh()
  }

  // Calculate stats
  const sentCount = appointments.filter(a => a.whatsapp_reminder_sent).length
  const totalCount = appointments.length

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <Smartphone size={16} className="text-green-500" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            WhatsApp Masivo
          </h2>
          {totalCount > 0 && (
            <span className="ml-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              {sentCount} / {totalCount} env.
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as WhatsAppDateFilter)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WhatsAppStatusFilter)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content (Glassmorphic Window) */}
      <div className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Cargando turnos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-secondary/50 border border-border/50 mx-auto mb-4 flex items-center justify-center shadow-inner">
              <Calendar className="h-8 w-8 text-muted-foreground/70" />
            </div>
            <h3 className="text-xl font-semibold text-foreground tracking-tight mb-2">Sin turnos</h3>
            <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto">
              No hay turnos {statusFilter === 'pending' ? 'pendientes de envío' : ''} para {dateFilter === 'today' ? 'hoy' : dateFilter === 'tomorrow' ? 'mañana' : 'esta semana'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {appointments.map(apt => {
              const startTime = new Date(apt.start_time)
              const isToday = new Date().toDateString() === startTime.toDateString()
              const isTomorrow = (() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                return tomorrow.toDateString() === startTime.toDateString()
              })()

              return (
                <div key={apt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-secondary/20 transition-colors duration-200 group">
                  {/* Time & Date */}
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
                    <div className={cn(
                      "flex-1 min-w-0 pl-3 border-l-[3px] py-0.5 rounded-sm",
                      apt.whatsapp_reminder_sent ? "border-green-500/30" : "border-primary/40"
                    )}>
                      <p className="font-semibold text-foreground truncate text-[15px] tracking-tight">
                        {apt.client_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <span className="truncate flex items-center gap-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            apt.whatsapp_reminder_sent ? "bg-green-500/40" : "bg-primary/40"
                          )}></span>
                          {apt.service?.name || 'Servicio'}
                        </span>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1.5 shrink-0 text-[13px]">
                          <Phone size={12} className="opacity-70" />
                          {apt.client_phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!apt.whatsapp_reminder_sent ? (
                    <Button
                      size="sm"
                      onClick={() => handleWhatsAppClick(apt)}
                      disabled={sendingId === apt.id}
                      className="h-9 px-4 bg-green-600/90 hover:bg-green-600 text-white gap-2 shadow-sm hover:shadow-md hover:shadow-green-600/20 hover:-translate-y-0.5 transition-all shrink-0"
                    >
                      {sendingId === apt.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <MessageCircle size={16} />
                          <span className="hidden sm:inline font-medium">Lanzar</span>
                          <ExternalLink size={12} className="ml-1 opacity-70" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="h-9 px-4 flex items-center justify-center gap-1.5 text-emerald-500 font-medium text-sm bg-emerald-500/5 rounded-md border border-emerald-500/10 shrink-0">
                      <Check size={16} strokeWidth={2.5} />
                      Enviado
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
