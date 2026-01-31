'use client'

import { useMemo, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list' // Imported list plugin
import { AppointmentWithService } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import esLocale from '@fullcalendar/core/locales/es'
import { EventClickArg } from '@fullcalendar/core'

interface CalendarViewProps {
  initialAppointments: AppointmentWithService[]
}

export default function CalendarView({ initialAppointments }: CalendarViewProps) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)

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

  // Transform appointments to FullCalendar events
  const events = useMemo(() => {
    return initialAppointments.map(apt => {
      // Color based on status
      let backgroundColor = '#db2777' // primary pink
      let borderColor = '#db2777'

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
  }, [initialAppointments])

  const handleEventClick = (info: EventClickArg) => {
    // Navigate to appointments page - could be enhanced to open a modal
    router.push('/admin/appointments')
  }

  return (
    <div className="bg-card border border-border rounded-xl p-2 md:p-6 overflow-hidden">
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
    </div>
  )
}
