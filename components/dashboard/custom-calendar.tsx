'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Phone, Mail, Clock, CheckCircle, XCircle, Loader2, Ban, CalendarPlus } from 'lucide-react'
import { AppointmentWithService, BlockedSlot } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { updateAppointmentStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AddAppointmentDialog } from './add-appointment-dialog'
import { cn } from '@/lib/utils'

interface CustomCalendarProps {
  initialAppointments: AppointmentWithService[]
  initialBlockedSlots: BlockedSlot[]
}

// Status color mapping (Glassmorphism style)
const statusColors: Record<string, { bg: string; border: string }> = {
  pending: { bg: 'bg-amber-500/10 backdrop-blur-sm', border: 'border-l-amber-500 border-t-amber-500/20 border-r-amber-500/20 border-b-amber-500/20' },
  confirmed: { bg: 'bg-emerald-500/10 backdrop-blur-sm', border: 'border-l-emerald-500 border-t-emerald-500/20 border-r-emerald-500/20 border-b-emerald-500/20' },
  completed: { bg: 'bg-blue-500/10 backdrop-blur-sm', border: 'border-l-blue-500 border-t-blue-500/20 border-r-blue-500/20 border-b-blue-500/20' },
  cancelled: { bg: 'bg-zinc-500/10 backdrop-blur-sm', border: 'border-l-zinc-500 border-t-zinc-500/20 border-r-zinc-500/20 border-b-zinc-500/20' },
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

const blockedStyles = {
  bg: 'bg-zinc-500/5 backdrop-blur-sm repeating-linear-gradient-45',
  border: 'border-l-muted-foreground/30 border-t-border/20 border-r-border/20 border-b-border/20',
  badge: 'bg-secondary text-muted-foreground'
}

export default function CustomCalendar({ initialAppointments, initialBlockedSlots }: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithService | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [appointments, setAppointments] = useState(initialAppointments)
  const [blockedSlots] = useState(initialBlockedSlots)
  const router = useRouter()

  // Handle new appointment created
  const handleAppointmentCreated = (newAppointment: AppointmentWithService) => {
    setAppointments(prev => [...prev, newAppointment])
    router.refresh() // Refresh server data
  }

  // Week days
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const blockedForSelectedDay = useMemo(
    () => getBlockedSlotsForDay(selectedDate),
    [getBlockedSlotsForDay, selectedDate]
  )

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

  function getDayBounds(date: Date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  function getBlockedSlotsForDay(date: Date) {
    const { start, end } = getDayBounds(date)
    const startTime = start.getTime()
    const endTime = end.getTime()

    return blockedSlots.filter(slot => {
      const slotStart = new Date(slot.start_time).getTime()
      const slotEnd = new Date(slot.end_time).getTime()
      return slotStart <= endTime && slotEnd >= startTime
    })
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

  // Navigate based on current view
  const navigatePrev = () => {
    const d = new Date(view === 'day' ? selectedDate : currentDate)
    if (view === 'day') {
      d.setDate(d.getDate() - 1)
      setSelectedDate(d)
    } else if (view === 'week') {
      d.setDate(d.getDate() - 7)
      setCurrentDate(d)
    } else {
      d.setMonth(d.getMonth() - 1)
      setCurrentDate(d)
    }
  }

  const navigateNext = () => {
    const d = new Date(view === 'day' ? selectedDate : currentDate)
    if (view === 'day') {
      d.setDate(d.getDate() + 1)
      setSelectedDate(d)
    } else if (view === 'week') {
      d.setDate(d.getDate() + 7)
      setCurrentDate(d)
    } else {
      d.setMonth(d.getMonth() + 1)
      setCurrentDate(d)
    }
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
    <div className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="relative flex items-center justify-between mb-4 px-2">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={navigateNext}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h2 className="text-lg font-semibold capitalize ml-2">{monthYear}</h2>
        </div>

        {/* Center: View Toggle (Segmented Control style) */}
        <div className="hidden md:flex items-center bg-secondary/80 backdrop-blur-md rounded-lg p-1 border border-border/50 absolute left-1/2 -translate-x-1/2 shadow-sm">
          <button
            onClick={() => setView('day')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
              view === 'day' 
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Día
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
              view === 'week' 
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Semana
          </button>
          <button
            onClick={() => setView('month')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
              view === 'month' 
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Mes
          </button>
        </div>

        {/* Right: Today Button + Add Appointment Button */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
          {/* Desktop: Add Appointment Button */}
          <Button 
            size="sm" 
            onClick={() => setShowAddDialog(true)}
            className="hidden md:inline-flex"
          >
            <Plus size={16} className="mr-1" />
            Nuevo turno
          </Button>
        </div>
      </div>

      {/* Mobile Date Picker */}
      <div className="flex justify-center gap-1 mb-4 px-2 md:hidden">
        {mobileDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center gap-1.5 px-2 py-1"
            >
              <span className={cn(
                "text-[11px] font-medium uppercase tracking-wide",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {day.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3)}
              </span>
              <span className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "text-primary ring-1 ring-primary/40"
                    : "text-foreground hover:bg-secondary"
              )}>
                {day.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Desktop Day Header */}
      {view === 'day' && (
        <div className="hidden md:block border-b border-border/40 mb-2 pb-3 pt-2">
          <div className="text-center">
            <span className="text-xl font-medium tracking-tight text-foreground">
              {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>
      )}

      {/* Desktop Week Header */}
      {view === 'week' && (
        <div className="hidden md:grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 mb-2 pt-2">
          <div /> {/* Time column spacer */}
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, new Date())
            return (
              <div key={idx} className="text-center pb-3">
                <span className={cn(
                  "text-[11px] font-medium uppercase tracking-wider",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {day.toLocaleDateString('es-AR', { weekday: 'short' })}
                </span>
                <div
                  className={cn(
                    "w-9 h-9 mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isToday ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-foreground"
                  )}
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
        <div className="px-2 pb-20 md:hidden">
            {HOURS.map(hour => {
              const appointments = getAppointmentsForDay(selectedDate).filter(apt => {
                const h = new Date(apt.start_time).getHours()
                return h === hour
              })
              const blockedForHour = blockedForSelectedDay.filter(slot => {
                const h = new Date(slot.start_time).getHours()
                return h === hour
              })

              return (
                <div key={hour} className="flex min-h-20">
                  <div className="w-12 text-xs text-muted-foreground pt-2">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 border-t border-border/50 pl-2 pt-2 space-y-2">
                    {blockedForHour.map(slot => (
                      <div
                        key={slot.id}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border-l-4 flex items-start justify-between gap-2',
                          blockedStyles.bg,
                          blockedStyles.border
                        )}
                      >
                        <div>
                          <p className="font-semibold text-foreground">Bloqueado</p>
                          <p className="text-xs text-muted-foreground">
                            {slot.reason || 'Horario no disponible'}
                          </p>
                        </div>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', blockedStyles.badge)}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                    ))}
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

        {/* Desktop Day Grid */}
        {view === 'day' && (
          <div className="hidden md:grid grid-cols-[60px_1fr]">
            {HOURS.map(hour => {
              const dayAppointments = getAppointmentsForDay(selectedDate).filter(apt => {
                const h = new Date(apt.start_time).getHours()
                return h === hour
              })
              const dayBlockedSlots = getBlockedSlotsForDay(selectedDate).filter(slot => {
                const h = new Date(slot.start_time).getHours()
                return h === hour
              })
              const isToday = isSameDay(selectedDate, new Date())

              return (
                <div key={hour} className="contents group">
                  <div className="h-20 text-[11px] font-medium text-muted-foreground/60 text-right pr-3 pt-1">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  <div
                    className={cn(
                      "h-20 border-t border-border/20 p-0.5 relative transition-colors",
                      isToday ? "bg-primary/[0.02]" : "",
                      "group-hover:bg-secondary/10"
                    )}
                  >
                    {dayBlockedSlots.map(slot => {
                      const startMinutes = new Date(slot.start_time).getMinutes()
                      const duration =
                        (new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / 60000
                      const height = Math.min((duration / 60) * 80, 160)

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            'absolute left-0.5 right-0.5 p-2 rounded-lg border-l-3 overflow-hidden text-left pointer-events-none',
                            blockedStyles.bg,
                            blockedStyles.border
                          )}
                          style={{
                            top: `${(startMinutes / 60) * 80}px`,
                            height: `${height}px`,
                            minHeight: '44px'
                          }}
                        >
                          <p className="text-sm font-medium text-foreground truncate">Bloqueado</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </p>
                        </div>
                      )
                    })}
                    {dayAppointments.map(apt => {
                      const colors = statusColors[apt.status] || statusColors.pending
                      const startMinutes = new Date(apt.start_time).getMinutes()
                      const duration =
                        (new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()) / 60000
                      const height = Math.min(duration / 60 * 80, 160)

                      return (
                        <button
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className={cn(
                            "absolute left-1 right-1 p-2 rounded-lg border overflow-hidden cursor-pointer",
                            "hover:scale-[1.01] hover:shadow-lg transition-all duration-200 hover:z-20 text-left",
                            colors.bg,
                            colors.border
                          )}
                          style={{
                            top: `${(startMinutes / 60) * 80}px`,
                            height: `${height}px`,
                            minHeight: '44px'
                          }}
                        >
                          <p className="text-sm font-medium text-foreground truncate drop-shadow-sm">
                            {apt.client_name}
                          </p>
                          <p className="text-xs text-foreground/80 truncate mt-0.5">
                            {formatTime(apt.start_time)} - {formatTime(apt.end_time)} <span className="opacity-50 mx-1">•</span> {apt.service?.name}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Current time indicator for day view */}
            {isSameDay(selectedDate, new Date()) && currentHour >= 8 && currentHour < 18 && (
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

        {/* Desktop Week Grid */}
        {view === 'week' && (
          <div className="hidden md:grid grid-cols-[60px_repeat(7,1fr)]">
            {HOURS.map(hour => (
              <div key={hour} className="contents">
                <div className="h-20 text-[11px] font-medium text-muted-foreground/60 text-right pr-3 pt-1">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dayAppointments = getAppointmentsForDay(day).filter(apt => {
                    const h = new Date(apt.start_time).getHours()
                    return h === hour
                  })
                  const dayBlockedSlots = getBlockedSlotsForDay(day).filter(slot => {
                    const h = new Date(slot.start_time).getHours()
                    return h === hour
                  })
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        "h-20 border-t border-l border-border/20 p-0.5 relative transition-colors hover:bg-secondary/10",
                        isToday ? "bg-primary/[0.02]" : ""
                      )}
                    >
                      {dayBlockedSlots.map(slot => {
                        const startMinutes = new Date(slot.start_time).getMinutes()
                        const duration =
                          (new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / 60000
                        const height = Math.min((duration / 60) * 80, 160)

                        return (
                          <div
                            key={slot.id}
                            className={cn(
                              'absolute left-0.5 right-0.5 p-1.5 rounded-lg border-l-3 overflow-hidden text-left pointer-events-none',
                              blockedStyles.bg,
                              blockedStyles.border
                            )}
                            style={{
                              top: `${(startMinutes / 60) * 80}px`,
                              height: `${height}px`,
                              minHeight: '40px'
                            }}
                          >
                            <p className="text-[10px] font-medium text-foreground truncate">Bloqueado</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatTime(slot.start_time)}
                            </p>
                          </div>
                        )
                      })}
                      {dayAppointments.map(apt => {
                        const colors = statusColors[apt.status] || statusColors.pending
                        const startMinutes = new Date(apt.start_time).getMinutes()
                        const duration =
                          (new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()) / 60000
                        const height = Math.min(duration / 60 * 80, 160) // Cap at 2 hours display

                        return (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className={cn(
                              "absolute left-0.5 right-0.5 p-1.5 rounded-lg border overflow-hidden cursor-pointer",
                              "hover:scale-[1.02] hover:shadow-lg transition-all duration-200 hover:z-20 text-left",
                              colors.bg,
                              colors.border
                            )}
                            style={{
                              top: `${(startMinutes / 60) * 80}px`,
                              height: `${height}px`,
                              minHeight: '40px'
                            }}
                          >
                            <p className="text-xs font-medium text-foreground truncate drop-shadow-sm">
                              {apt.client_name}
                            </p>
                            <p className="text-[10px] text-foreground/80 truncate mt-0.5">
                              {formatTime(apt.start_time)} <span className="opacity-50 mx-0.5">•</span> {apt.service?.name}
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

        {/* Desktop Month Grid */}
        {view === 'month' && (
          <div className="hidden md:block">
            <MonthView
              currentDate={currentDate}
              appointments={appointments}
              blockedSlots={blockedSlots}
              onSelectDate={(date) => {
                setSelectedDate(date)
                setView('day')
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden">
          {/* Backdrop to close FAB menu */}
          {showFabMenu && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowFabMenu(false)}
            />
          )}
          <div className="fixed bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] right-6 z-20">
            {/* FAB Menu */}
            {showFabMenu && (
              <div className="absolute bottom-16 right-0 bg-card border border-border rounded-xl shadow-xl py-2 min-w-45 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => {
                    setShowFabMenu(false)
                    setShowAddDialog(true)
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors w-full text-left"
                >
                  <CalendarPlus size={18} className="text-primary" />
                  <span className="text-sm font-medium">Agregar turno</span>
                </button>
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
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in" 
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/50">
              <h3 className="text-lg font-medium tracking-tight text-foreground">Detalles de la cita</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground transition-colors"
              >
                <X size={18} />
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
              <div className="p-5 border-t border-border/50 bg-background/30 space-y-3">
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

      {/* Add Appointment Dialog */}
      <AddAppointmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAppointmentCreated={handleAppointmentCreated}
        selectedDate={selectedDate}
      />
    </div>
  )
}

// Month View Component
function MonthView({
  currentDate,
  appointments,
  blockedSlots,
  onSelectDate
}: {
  currentDate: Date
  appointments: AppointmentWithService[]
  blockedSlots: BlockedSlot[]
  onSelectDate: (date: Date) => void
}) {
  // Get first day of the month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  // Get the day of week the month starts on (0 = Sunday)
  const startDayOfWeek = firstDayOfMonth.getDay()

  // Build array of days to show (including padding for previous month)
  const days: (Date | null)[] = []

  // Add padding days from previous month
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }

  // Add all days of the current month
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
  }

  // Get appointments count for a specific day
  const getAppointmentCount = (date: Date) => {
    return appointments.filter(apt =>
      isSameDay(new Date(apt.start_time), date) && apt.status !== 'cancelled'
    ).length
  }

  const getBlockedCount = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)
    const startTime = dayStart.getTime()
    const endTime = dayEnd.getTime()

    return blockedSlots.filter(slot => {
      const slotStart = new Date(slot.start_time).getTime()
      const slotEnd = new Date(slot.end_time).getTime()
      return slotStart <= endTime && slotEnd >= startTime
    }).length
  }

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div className="p-2">
      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="h-24 rounded-lg bg-secondary/20" />
          }

          const isToday = isSameDay(day, new Date())
          const appointmentCount = getAppointmentCount(day)
          const blockedCount = getBlockedCount(day)
          const hasAppointments = appointmentCount > 0
          const hasBlocked = blockedCount > 0

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`h-24 rounded-lg border text-left p-2 transition-all hover:border-primary/50 hover:bg-secondary/50 ${isToday
                ? 'border-primary bg-primary/5'
                : 'border-border/50 bg-card'
                }`}
            >
              <div className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                {day.getDate()}
              </div>
              {hasAppointments && (
                <div className="mt-1">
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    {appointmentCount} cita{appointmentCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {hasBlocked && (
                <div className="mt-1">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded', blockedStyles.badge)}>
                    {blockedCount} bloqueado{blockedCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
