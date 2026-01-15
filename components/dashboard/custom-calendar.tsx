'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Phone, Mail, Clock, CheckCircle, XCircle, Loader2, Ban } from 'lucide-react'
import { AppointmentWithService } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { updateAppointmentStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CustomCalendarProps {
  initialAppointments: AppointmentWithService[]
}

// Status color mapping
const statusColors: Record<string, { bg: string; border: string }> = {
  pending: { bg: 'bg-amber-500/20', border: 'border-l-amber-500' },
  confirmed: { bg: 'bg-blue-500/20', border: 'border-l-blue-500' },
  completed: { bg: 'bg-emerald-500/20', border: 'border-l-emerald-500' },
  cancelled: { bg: 'bg-zinc-500/20', border: 'border-l-zinc-500' },
}

// Get week days starting from a date
function getWeekDays(date: Date): Date[] {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  start.setDate(diff)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

// Format time
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// Check if same day
function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
}

// Hours for the grid (8am to 6pm)
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8)

// Status labels
const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export default function CustomCalendar({ initialAppointments }: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [isMobile, setIsMobile] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [appointments, setAppointments] = useState(initialAppointments)
  const router = useRouter()

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Week days
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  // Display days for mobile (5 days from selected)
  const mobileDays = useMemo(() => {
    const days: Date[] = []
    const start = new Date(selectedDate)
    start.setDate(start.getDate() - 2)
    for (let i = 0; i < 5; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }, [selectedDate])

  // Filter appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    return appointments
      .filter(apt => isSameDay(new Date(apt.start_time), date) && apt.status !== 'cancelled')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  // Handle status change
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setUpdatingStatus(newStatus)
    try {
      const result = await updateAppointmentStatus(appointmentId, newStatus)
      if (result.success && result.data) {
        // Update local state
        setAppointments(prev => prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        ))
        setSelectedAppointment(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Navigate weeks
  const prevWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }

  const nextWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Current time position
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTimePercent = ((currentHour - 8) * 60 + currentMinute) / (10 * 60) * 100

  // Month/Year display
  const monthYear = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="relative flex items-center justify-between mb-4 px-2">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h2 className="text-lg font-semibold capitalize ml-2">{monthYear}</h2>
        </div>

        {/* Center: View Toggle (absolutely centered) */}
        <div className="hidden md:flex items-center bg-secondary rounded-lg p-1 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => setView('day')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'day' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
          >
            Día
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'week' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
          >
            Semana
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'month' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
          >
            Mes
          </button>
        </div>

        {/* Right: Today Button */}
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoy
        </Button>
      </div>

      {/* Mobile Date Picker */}
      {isMobile && (
        <div className="flex justify-center gap-2 mb-4 px-2">
          {mobileDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all ${isSelected
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : isToday
                    ? 'bg-secondary'
                    : 'hover:bg-secondary/50'
                  }`}
              >
                <span className="text-xs font-medium uppercase">
                  {day.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3)}
                </span>
                <span className="text-lg font-bold">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Desktop Week Header */}
      {!isMobile && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border mb-1">
          <div /> {/* Time column spacer */}
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, new Date())
            return (
              <div key={idx} className="text-center py-2">
                <span className="text-xs text-muted-foreground uppercase">
                  {day.toLocaleDateString('es-AR', { weekday: 'short' })}
                </span>
                <div
                  className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-primary text-primary-foreground' : ''
                    }`}
                >
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar Grid / Timeline */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Mobile Timeline View */}
        {isMobile && (
          <div className="px-2 pb-20">
            {HOURS.map(hour => {
              const appointments = getAppointmentsForDay(selectedDate).filter(apt => {
                const h = new Date(apt.start_time).getHours()
                return h === hour
              })

              return (
                <div key={hour} className="flex min-h-20">
                  <div className="w-12 text-xs text-muted-foreground pt-2">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 border-t border-border/50 pl-2 pt-2 space-y-2">
                    {appointments.map(apt => {
                      const colors = statusColors[apt.status] || statusColors.pending
                      return (
                        <button
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className={`w-full text-left p-3 rounded-xl border-l-4 ${colors.bg} ${colors.border} hover:brightness-110 transition-all`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{apt.client_name}</p>
                              <p className="text-sm text-muted-foreground">{apt.service?.name}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg}`}>
                              {statusLabels[apt.status] || apt.status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 bg-secondary rounded">
                              {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Current time indicator */}
            {isSameDay(selectedDate, new Date()) && currentTimePercent >= 0 && currentTimePercent <= 100 && (
              <div
                className="absolute left-12 right-0 flex items-center pointer-events-none z-10"
                style={{ top: `${(currentTimePercent / 100) * (HOURS.length * 80)}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="flex-1 h-0.5 bg-red-500" />
                <span className="text-xs text-red-500 font-medium ml-1">
                  {String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Desktop Week Grid */}
        {!isMobile && (
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {HOURS.map(hour => (
              <div key={hour} className="contents">
                <div className="h-20 text-xs text-muted-foreground text-right pr-2 pt-1">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((day, dayIdx) => {
                  const appointments = getAppointmentsForDay(day).filter(apt => {
                    const h = new Date(apt.start_time).getHours()
                    return h === hour
                  })
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={dayIdx}
                      className={`h-20 border-t border-l border-border/30 p-0.5 relative ${isToday ? 'bg-primary/5' : ''
                        }`}
                    >
                      {appointments.map(apt => {
                        const colors = statusColors[apt.status] || statusColors.pending
                        const startMinutes = new Date(apt.start_time).getMinutes()
                        const duration =
                          (new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()) / 60000
                        const height = Math.min(duration / 60 * 80, 160) // Cap at 2 hours display

                        return (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className={`absolute left-0.5 right-0.5 p-1.5 rounded-lg border-l-3 ${colors.bg} ${colors.border} overflow-hidden cursor-pointer hover:brightness-110 transition-all text-left`}
                            style={{
                              top: `${(startMinutes / 60) * 80}px`,
                              height: `${height}px`,
                              minHeight: '40px'
                            }}
                          >
                            <p className="text-xs font-medium text-foreground truncate">
                              {apt.client_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatTime(apt.start_time)} • {apt.service?.name}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Current time indicator for desktop */}
            {currentHour >= 8 && currentHour < 18 && weekDays.some(d => isSameDay(d, new Date())) && (
              <div
                className="absolute left-15 right-0 flex items-center pointer-events-none z-10"
                style={{ top: `${((currentHour - 8) * 80) + (currentMinute / 60 * 80)}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <>
          {/* Backdrop to close FAB menu */}
          {showFabMenu && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowFabMenu(false)}
            />
          )}
          <div className="fixed bottom-6 right-6 z-20">
            {/* FAB Menu */}
            {showFabMenu && (
              <div className="absolute bottom-16 right-0 bg-card border border-border rounded-xl shadow-xl py-2 min-w-45 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <Link
                  href="/dashboard/availability"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
                  onClick={() => setShowFabMenu(false)}
                >
                  <Ban size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Bloquear horario</span>
                </Link>
              </div>
            )}
            {/* FAB Button */}
            <button
              onClick={() => setShowFabMenu(!showFabMenu)}
              className={`w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-transform ${showFabMenu ? 'rotate-45' : ''}`}
            >
              <Plus size={24} />
            </button>
          </div>
        </>
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAppointment(null)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Detalles de la cita</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedAppointment.status]?.bg || 'bg-secondary'}`}>
                  {statusLabels[selectedAppointment.status] || selectedAppointment.status}
                </span>
              </div>

              {/* Client Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {selectedAppointment.client_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{selectedAppointment.client_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedAppointment.service?.name}</p>
                  </div>
                </div>

                {selectedAppointment.client_phone && (
                  <a
                    href={`tel:${selectedAppointment.client_phone}`}
                    className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <Phone size={18} className="text-muted-foreground" />
                    <span className="text-sm">{selectedAppointment.client_phone}</span>
                  </a>
                )}

                {selectedAppointment.client_email && (
                  <a
                    href={`mailto:${selectedAppointment.client_email}`}
                    className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <Mail size={18} className="text-muted-foreground" />
                    <span className="text-sm">{selectedAppointment.client_email}</span>
                  </a>
                )}

                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                  <Clock size={18} className="text-muted-foreground" />
                  <div className="text-sm">
                    <p>{new Date(selectedAppointment.start_time).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-muted-foreground">{formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</p>
                  </div>
                </div>

                {/* Price */}
                {selectedAppointment.service?.price && (
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                    <span className="text-sm text-muted-foreground">Precio</span>
                    <span className="font-semibold">${selectedAppointment.service.price.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
              <div className="p-4 border-t border-border space-y-2">
                {selectedAppointment.status === 'pending' && (
                  <Button
                    onClick={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
                    disabled={updatingStatus !== null}
                    className="w-full"
                  >
                    {updatingStatus === 'confirmed' ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <CheckCircle size={18} className="mr-2" />
                    )}
                    Confirmar cita
                  </Button>
                )}
                {selectedAppointment.status === 'confirmed' && (
                  <Button
                    onClick={() => handleStatusChange(selectedAppointment.id, 'completed')}
                    disabled={updatingStatus !== null}
                    className="w-full"
                  >
                    {updatingStatus === 'completed' ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <CheckCircle size={18} className="mr-2" />
                    )}
                    Marcar como completada
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(selectedAppointment.id, 'cancelled')}
                  disabled={updatingStatus !== null}
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {updatingStatus === 'cancelled' ? (
                    <Loader2 size={18} className="animate-spin mr-2" />
                  ) : (
                    <XCircle size={18} className="mr-2" />
                  )}
                  Cancelar cita
                </Button>
              </div>
            )}

            {/* Completed/Cancelled state */}
            {(selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'completed') && (
              <div className="p-4 border-t border-border">
                <p className="text-center text-sm text-muted-foreground">
                  {selectedAppointment.status === 'cancelled' ? 'Esta cita fue cancelada' : 'Esta cita fue completada'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
