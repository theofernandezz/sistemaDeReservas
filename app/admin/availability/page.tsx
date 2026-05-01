'use client'

import { useState, useEffect } from 'react'
import AvailabilityManager from '@/components/admin/availability-manager'
import BlockedDatesManager from '@/components/admin/blocked-dates-manager'
import { getSoloAvailability, saveSoloAvailability } from '@/app/actions/team'
import { WeeklySchedule } from '@/types/database.types'

export const dynamic = 'force-dynamic'

interface DaySchedule {
  dayOfWeek: number
  dayName: string
  isOpen: boolean
  startTime: string
  endTime: string
}

interface AvailabilityConfig {
  schedule: DaySchedule[]
  slotInterval: number
}

const DAY_NAMES: Record<string, string> = {
  '0': 'Domingo',
  '1': 'Lunes',
  '2': 'Martes',
  '3': 'Miércoles',
  '4': 'Jueves',
  '5': 'Viernes',
  '6': 'Sábado',
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, dayName: 'Lunes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, dayName: 'Martes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, dayName: 'Miércoles', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, dayName: 'Jueves', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, dayName: 'Viernes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, startTime: '10:00', endTime: '14:00' },
  { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, startTime: '10:00', endTime: '14:00' },
]

function weeklyScheduleToDaySchedules(schedule: WeeklySchedule): DaySchedule[] {
  return Object.entries(schedule)
    .map(([dayKey, dayData]) => ({
      dayOfWeek: parseInt(dayKey),
      dayName: DAY_NAMES[dayKey] || `Día ${dayKey}`,
      isOpen: dayData.isOpen,
      startTime: dayData.startTime,
      endTime: dayData.endTime,
    }))
    .sort((a, b) => {
      // Sort Mon–Sun (1,2,3,4,5,6,0)
      const order = [1, 2, 3, 4, 5, 6, 0]
      return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek)
    })
}

function daySchedulesToWeeklySchedule(schedule: DaySchedule[]): WeeklySchedule {
  return Object.fromEntries(
    schedule.map(day => [
      String(day.dayOfWeek),
      { isOpen: day.isOpen, startTime: day.startTime, endTime: day.endTime, breaks: [] }
    ])
  ) as WeeklySchedule
}

export default function AvailabilityPage() {
  const [mounted, setMounted] = useState(false)
  const [initialConfig, setInitialConfig] = useState<{ schedule: DaySchedule[], interval: number }>({
    schedule: DEFAULT_SCHEDULE,
    interval: 30
  })
  const [activeTab, setActiveTab] = useState<'schedule' | 'blocked'>('schedule')

  useEffect(() => {
    async function loadAvailability() {
      const result = await getSoloAvailability()
      if (result.success && result.data) {
        setInitialConfig({
          schedule: weeklyScheduleToDaySchedules(result.data.schedule),
          interval: result.data.interval,
        })
      }
      setMounted(true)
    }
    loadAvailability()
  }, [])

  const handleSave = async (config: AvailabilityConfig): Promise<boolean> => {
    try {
      const weeklySchedule = daySchedulesToWeeklySchedule(config.schedule)
      const result = await saveSoloAvailability({
        schedule: weeklySchedule,
        interval: config.slotInterval,
        buffer: 0,
      })

      if (!result.success) {
        alert(result.error || 'Error al guardar la configuración')
        return false
      }

      return true
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Error al guardar la configuración')
      return false
    }
  }

  if (!mounted) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-secondary/30 rounded w-1/3 mb-6"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="h-16 bg-secondary/30 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Gestión de Disponibilidad</h1>
        <p className="text-sm text-muted-foreground">Configura los horarios de atención y bloquea fechas específicas</p>
      </div>

      <div className="flex bg-secondary/30 w-full rounded-lg p-1 mb-6">
        <button
          className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'schedule' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('schedule')}
        >
          Horarios de Semana
        </button>
        <button
          className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'blocked' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('blocked')}
        >
          Bloquear Fechas
        </button>
      </div>

      {activeTab === 'schedule' ? (
        <AvailabilityManager
          initialSchedule={initialConfig.schedule}
          initialInterval={initialConfig.interval}
          onSave={handleSave}
        />
      ) : (
        <BlockedDatesManager />
      )}
    </div>
  )
}
