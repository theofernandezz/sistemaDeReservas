'use client'

import { useState, useEffect } from 'react'
import AvailabilityManager from '@/components/admin/availability-manager'
import BlockedDatesManager from '@/components/admin/blocked-dates-manager'

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

// Storage key
const STORAGE_KEY = 'luxenail_business_hours'

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, dayName: 'Lunes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, dayName: 'Martes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, dayName: 'Miércoles', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, dayName: 'Jueves', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, dayName: 'Viernes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, startTime: '10:00', endTime: '14:00' },
  { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, startTime: '10:00', endTime: '14:00' },
]

function getStoredConfig(): { schedule: DaySchedule[], interval: number } {
  if (typeof window === 'undefined') return { schedule: DEFAULT_SCHEDULE, interval: 30 }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Support both old format (array) and new format (object with schedule + slotInterval)
      if (Array.isArray(parsed)) {
        return { schedule: parsed, interval: 30 }
      }
      return {
        schedule: parsed.schedule || DEFAULT_SCHEDULE,
        interval: parsed.slotInterval || 30
      }
    }
    return { schedule: DEFAULT_SCHEDULE, interval: 30 }
  } catch {
    return { schedule: DEFAULT_SCHEDULE, interval: 30 }
  }
}

export default function AvailabilityPage() {
  const [mounted, setMounted] = useState(false)
  const [initialConfig, setInitialConfig] = useState<{ schedule: DaySchedule[], interval: number }>({
    schedule: DEFAULT_SCHEDULE,
    interval: 30
  })
  const [activeTab, setActiveTab] = useState<'schedule' | 'blocked'>('schedule')

  useEffect(() => {
    setInitialConfig(getStoredConfig())
    setMounted(true)
  }, [])

  const handleSave = async (config: AvailabilityConfig): Promise<boolean> => {
    try {
      // Save to localStorage for client-side access
      const dataToStore = {
        schedule: config.schedule,
        slotInterval: config.slotInterval
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore))

      // Also save to cookie for server-side access (Server Components)
      const cookieValue = encodeURIComponent(JSON.stringify(dataToStore))
      document.cookie = `business_hours=${cookieValue};path=/;max-age=31536000;SameSite=Lax`

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
