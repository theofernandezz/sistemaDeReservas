'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import CancelForm from './cancel-form'
import RescheduleForm from './reschedule-form'

const MODES = {
  Choose: 'choose',
  Reschedule: 'reschedule',
  Cancel: 'cancel'
} as const

type Mode = typeof MODES[keyof typeof MODES]

interface AppointmentActionsProps {
  appointmentId: string
  serviceId: string
  serviceDuration: number
  businessHours?: string
  canReschedule: boolean
  rescheduleMessage?: string
}

export default function AppointmentActions({
  appointmentId,
  serviceId,
  serviceDuration,
  businessHours,
  canReschedule,
  rescheduleMessage
}: AppointmentActionsProps) {
  const [mode, setMode] = useState<Mode>(MODES.Choose)

  if (mode === MODES.Cancel) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setMode(MODES.Choose)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver atrás
        </Button>
        <CancelForm appointmentId={appointmentId} />
      </div>
    )
  }

  if (mode === MODES.Reschedule) {
    if (!canReschedule) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {rescheduleMessage}
          </div>
          <Button
            variant="outline"
            onClick={() => setMode(MODES.Choose)}
            className="w-full"
          >
            Volver
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setMode(MODES.Choose)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver atrás
        </Button>
        <RescheduleForm
          appointmentId={appointmentId}
          serviceId={serviceId}
          serviceDuration={serviceDuration}
          businessHours={businessHours}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Button
          variant="default"
          className={cn(
            "w-full h-12 text-base font-medium shadow-md transition-all",
            "hover:shadow-lg hover:-translate-y-0.5"
          )}
          onClick={() => setMode(MODES.Reschedule)}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Reprogramar Turno
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">o</span>
          </div>
        </div>

        <Button
          variant="outline"
          className={cn(
            "w-full h-12 text-base font-medium transition-all",
            "border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground",
            "hover:border-destructive"
          )}
          onClick={() => setMode(MODES.Cancel)}
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar Turno
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground/80">
        {canReschedule
          ? 'Podés reprogramar tu turno sin cargo o cancelarlo definitivamente'
          : 'Solo podés cancelar este turno'
        }
      </p>
    </div>
  )
}
