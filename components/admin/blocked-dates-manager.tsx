'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, Trash2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface BlockedDate {
  id: string
  date: Date
  reason?: string
}

export default function BlockedDatesManager() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  // Mock checking local storage for blocked dates
  // In a real app this would sync with DB

  const handleBlockDate = () => {
    if (!selectedDate) return

    // Check if already blocked
    if (blockedDates.some(bd => bd.date.toDateString() === selectedDate.toDateString())) {
      return
    }

    const newBlocked: BlockedDate = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDate,
      reason: 'Día bloqueado manualmente'
    }

    setBlockedDates([...blockedDates, newBlocked])
    setSelectedDate(undefined)
  }

  const handleRemoveDate = (id: string) => {
    setBlockedDates(blockedDates.filter(bd => bd.id !== id))
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-5 flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5" />
            Seleccionar Fecha
          </h3>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>
          <div className="mt-6">
            <Button
              onClick={handleBlockDate}
              disabled={!selectedDate}
              className="w-full h-11"
            >
              <Plus className="mr-2 h-4 w-4" />
              Bloquear Fecha
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-5 text-lg">Fechas Bloqueadas</h3>
          {blockedDates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              No hay fechas bloqueadas
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {blockedDates.sort((a, b) => a.date.getTime() - b.date.getTime()).map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border text-sm"
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">
                      {format(bd.date, "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveDate(bd.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
