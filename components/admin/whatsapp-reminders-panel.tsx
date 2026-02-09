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
          <Smartphone size={20} className="text-green-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Recordatorios WhatsApp
          </h2>
          {totalCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
              {sentCount}/{totalCount} enviados
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

      {/* Content */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Cargando turnos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Sin turnos</h3>
            <p className="text-sm text-muted-foreground">
              No hay turnos {statusFilter === 'pending' ? 'pendientes de envío' : ''} para {dateFilter === 'today' ? 'hoy' : dateFilter === 'tomorrow' ? 'mañana' : 'esta semana'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {appointments.map(apt => {
              const startTime = new Date(apt.start_time)
              const isToday = new Date().toDateString() === startTime.toDateString()
              const isTomorrow = (() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                return tomorrow.toDateString() === startTime.toDateString()
              })()

              return (
                <div key={apt.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Time & Date */}
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
                    <div className={cn(
                      "w-1 h-12 rounded-full",
                      apt.whatsapp_reminder_sent ? "bg-green-500/30" : "bg-primary/20"
                    )} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {apt.client_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">💅 {apt.service?.name || 'Servicio'}</span>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Phone size={12} />
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
                      className="bg-green-600 hover:bg-green-700 text-white gap-1.5 shadow-lg shadow-green-600/25 shrink-0"
                    >
                      {sendingId === apt.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <MessageCircle size={14} />
                          <span>Enviar</span>
                          <ExternalLink size={12} />
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-green-500 text-sm px-3 shrink-0">
                      <Check size={16} />
                      Enviado
                    </span>
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
