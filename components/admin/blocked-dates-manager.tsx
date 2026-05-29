'use client'

import { useState, useEffect, useTransition } from 'react'
import { Calendar as CalendarIcon, Trash2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getBlockedSlots, createBlockedSlot, deleteBlockedSlot } from '@/app/actions'
import type { BlockedSlot } from '@/types/database.types'

// Argentina is permanently UTC-3 (no DST).
// Midnight BA = 03:00 UTC. 23:59:59 BA = next-day 02:59:59 UTC.
function fullDayBoundsUTC(dateStr: string): { start_time: string; end_time: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start_time = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0)).toISOString()
  // hour 26 = next day 02 (Date.UTC normalises overflow automatically)
  const end_time = new Date(Date.UTC(y, m - 1, d, 26, 59, 59, 999)).toISOString()
  return { start_time, end_time }
}

// Get 'yyyy-MM-dd' from a UTC ISO string using the Argentina offset (-3h).
// Avoids relying on browser TZ which may differ from the server's assumption.
function dateStrFromSlot(utcString: string): string {
  // Subtract 3 hours so midnight-BA (03:00 UTC) maps to {date}T00:00:00
  const argDate = new Date(new Date(utcString).getTime() - 3 * 60 * 60 * 1000)
  return `${argDate.getUTCFullYear()}-${String(argDate.getUTCMonth() + 1).padStart(2, '0')}-${String(argDate.getUTCDate()).padStart(2, '0')}`
}

export default function BlockedDatesManager() {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState('')
  const [loadingInit, setLoadingInit] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load existing blocked slots from DB on mount
  useEffect(() => {
    getBlockedSlots().then((result) => {
      if (result.success && result.data) setBlockedSlots(result.data)
      setLoadingInit(false)
    })
  }, [])

  const blockedDateStrings = new Set(blockedSlots.map((s) => dateStrFromSlot(s.start_time)))

  const handleBlockDate = () => {
    if (!selectedDate) return
    setError(null)

    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    if (blockedDateStrings.has(dateStr)) {
      setError('Esta fecha ya está bloqueada.')
      return
    }

    const { start_time, end_time } = fullDayBoundsUTC(dateStr)

    startTransition(async () => {
      const result = await createBlockedSlot({
        start_time,
        end_time,
        reason: reason.trim() || 'Día bloqueado manualmente',
      })
      if (result.success && result.data) {
        setBlockedSlots((prev) =>
          [...prev, result.data!].sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          )
        )
        setSelectedDate(undefined)
        setReason('')
      } else {
        setError(result.error ?? 'Error al bloquear la fecha')
      }
    })
  }

  const handleRemoveDate = (id: string) => {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteBlockedSlot(id)
      if (result.success) {
        setBlockedSlots((prev) => prev.filter((s) => s.id !== id))
      } else {
        setError(result.error ?? 'Error al eliminar el bloqueo')
      }
      setDeletingId(null)
    })
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
              classNames={{
                months: 'relative flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month_caption: 'flex items-center justify-center h-9',
                caption_label: 'text-sm font-medium capitalize',
                nav: 'absolute inset-x-0 top-0 flex items-center justify-between px-1 h-9 z-10',
              }}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                blockedDateStrings.has(format(date, 'yyyy-MM-dd'))
              }
            />
          </div>
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Motivo (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={handleBlockDate}
              disabled={!selectedDate || isPending}
              className="w-full h-11"
            >
              {isPending && !deletingId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Bloquear Fecha
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-5 text-lg">Fechas Bloqueadas</h3>
          {loadingInit ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : blockedSlots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              No hay fechas bloqueadas
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {blockedSlots.map((slot) => {
                const localDate = new Date(
                  new Date(slot.start_time).getTime() - 3 * 60 * 60 * 1000
                )
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border text-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium capitalize flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        {format(localDate, "EEEE d 'de' MMMM", { locale: es })}
                      </span>
                      {slot.reason && (
                        <span className="text-xs text-muted-foreground pl-6">{slot.reason}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      disabled={deletingId === slot.id || isPending}
                      onClick={() => handleRemoveDate(slot.id)}
                      aria-label="Eliminar horario bloqueado"
                    >
                      {deletingId === slot.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
