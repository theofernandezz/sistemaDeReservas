'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { AppointmentWithService, TeamMember } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import esLocale from '@fullcalendar/core/locales/es'
import { EventClickArg } from '@fullcalendar/core'
import { cn } from '@/lib/utils'

interface CalendarViewProps {
  initialAppointments: AppointmentWithService[]
  members?: TeamMember[]
}

const AVATAR_COLOR_MAP: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-red-500': '#ef4444',
  'bg-green-500': '#22c55e',
  'bg-yellow-500': '#eab308',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-orange-500': '#f97316',
  'bg-teal-500': '#14b8a6',
  'bg-indigo-500': '#6366f1',
  'bg-cyan-500': '#06b6d4',
  'bg-rose-500': '#f43f5e',
  'bg-amber-500': '#f59e0b',
}

export default function CalendarView({ initialAppointments, members = [] }: CalendarViewProps) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all')
  const hasTeam = members.length > 0

  // Responsive: Switch to list view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi()
        if (window.innerWidth < 768) {
          calendarApi.changeView('listWeek')
        } else {
          calendarApi.changeView('dayGridMonth')
        }
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filteredAppointments = useMemo(() => {
    if (!hasTeam || selectedMemberId === 'all') return initialAppointments
    if (selectedMemberId === 'unassigned') return initialAppointments.filter(a => a.team_member_id === null)
    return initialAppointments.filter(a => a.team_member_id === selectedMemberId)
  }, [initialAppointments, selectedMemberId, hasTeam])

  const memberColorMap = useMemo(
    () => new Map(members.map(m => [m.id, AVATAR_COLOR_MAP[m.avatar_color] ?? '#db2777'])),
    [members]
  )

  // Transform appointments to FullCalendar events
  const events = useMemo(() => {
    return filteredAppointments.map(apt => {
      let backgroundColor = '#db2777'
      let borderColor = '#db2777'

      // When showing all members, color by member
      if (hasTeam && selectedMemberId === 'all' && apt.team_member_id) {
        const memberColor = memberColorMap.get(apt.team_member_id) ?? '#db2777'
        backgroundColor = memberColor
        borderColor = memberColor
      } else {
        // Color by status
        if (apt.status === 'cancelled') {
          backgroundColor = '#a1a1aa'
          borderColor = '#a1a1aa'
        } else if (apt.status === 'completed') {
          backgroundColor = '#22c55e'
          borderColor = '#22c55e'
        } else if (apt.status === 'confirmed') {
          backgroundColor = '#3b82f6'
          borderColor = '#3b82f6'
        }
      }

      return {
        id: apt.id,
        title: `${apt.client_name} - ${apt.service?.name || 'Servicio'}`,
        start: apt.start_time,
        end: apt.end_time,
        backgroundColor,
        borderColor,
        extendedProps: {
          status: apt.status,
          clientName: apt.client_name,
          clientPhone: apt.client_phone,
          serviceName: apt.service?.name
        }
      }
    })
  }, [filteredAppointments, memberColorMap, hasTeam, selectedMemberId])

  const handleEventClick = (info: EventClickArg) => {
    // Navigate to appointments page - could be enhanced to open a modal
    router.push('/admin/appointments')
  }

  return (
    <div className="bg-card border border-border rounded-xl p-2 md:p-6 overflow-hidden">
      {/* Member filter — only shown when business has a team */}
      {hasTeam && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedMemberId('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedMemberId === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            Todos
          </button>
          {members.map(member => (
            <button
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
                selectedMemberId === member.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: AVATAR_COLOR_MAP[member.avatar_color] ?? '#db2777' }}
              />
              {member.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedMemberId('unassigned')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedMemberId === 'unassigned'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            Sin asignar
          </button>
        </div>
      )}

      <style jsx global>{`
        .fc {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-today-bg-color: hsl(var(--primary) / 0.1);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: hsl(var(--secondary));
          --fc-list-event-hover-bg-color: hsl(var(--secondary) / 0.5);
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .fc .fc-button {
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
        }
        .fc .fc-button-group > .fc-button {
          border-radius: 0;
        }
        .fc .fc-button-group > .fc-button:first-child {
          border-radius: 0.5rem 0 0 0.5rem;
        }
        .fc .fc-button-group > .fc-button:last-child {
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .fc .fc-daygrid-day-number {
          font-size: 0.875rem;
          padding: 0.5rem;
        }
        .fc .fc-event {
          border-radius: 0.375rem;
          font-size: 0.75rem;
          padding: 2px 4px;
          cursor: pointer;
        }
        .fc .fc-col-header-cell-cushion {
          font-weight: 500;
          text-transform: capitalize;
        }
        .fc-list-event-time {
          display: none; /* Hide time column in list view if redundant with dot */
        }
        @media (max-width: 640px) {
          .fc .fc-toolbar {
            flex-direction: column;
            gap: 0.75rem;
            align-items: center;
          }
          .fc .fc-toolbar-title {
            font-size: 1.1rem;
          }
          .fc .fc-button {
            font-size: 0.75rem;
            padding: 0.4rem 0.6rem;
          }
          .fc-header-toolbar {
            margin-bottom: 1rem !important;
          }
        }
      `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]} // Added listPlugin
        initialView="dayGridMonth"
        locale={esLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek' // Changed timeGridDay to listWeek
        }}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        aspectRatio={1.5}
        nowIndicator={true}
        dayMaxEvents={3}
        moreLinkText={(num) => `+${num} más`}
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          list: 'Agenda'
        }}
        views={{
          listWeek: { buttonText: 'Agenda' },
          dayGridMonth: { buttonText: 'Mes' },
          timeGridWeek: { buttonText: 'Semana' }
        }}
      />

      {/* Legend */}
      {(!hasTeam || selectedMemberId !== 'all') && (
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap justify-center sm:justify-start gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#db2777]"></div>
            <span className="text-muted-foreground">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
            <span className="text-muted-foreground">Confirmada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
            <span className="text-muted-foreground">Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#a1a1aa]"></div>
            <span className="text-muted-foreground">Cancelada</span>
          </div>
        </div>
      )}
      {hasTeam && selectedMemberId === 'all' && (
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap justify-center sm:justify-start gap-4 text-sm">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: AVATAR_COLOR_MAP[member.avatar_color] ?? '#db2777' }}
              />
              <span className="text-muted-foreground">{member.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
