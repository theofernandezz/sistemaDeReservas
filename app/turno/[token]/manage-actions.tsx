'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ManagedAppointmentView } from '@/lib/manage-appointment-types'
import { cn } from '@/lib/utils'
import CancelDialog from './cancel-dialog'
import ReschedulePanel from './reschedule-panel'

export interface RescheduleDateOption {
  /** YYYY-MM-DD (Argentina) */
  value: string
  weekday: string
  label: string
}

interface ManageActionsProps {
  token: string
  view: ManagedAppointmentView
  dateOptions: RescheduleDateOption[]
}

export default function ManageActions({ token, view, dateOptions }: ManageActionsProps) {
  const router = useRouter()
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const handleRescheduled = () => {
    setRescheduling(false)
    setNotice('Tu turno fue reprogramado. Te enviamos un mail con los nuevos datos.')
    router.refresh()
  }

  if (rescheduling) {
    return (
      <ReschedulePanel
        token={token}
        dateOptions={dateOptions}
        onDone={handleRescheduled}
        onBack={() => setRescheduling(false)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div
          role="status"
          className="p-3 bg-green-50 text-green-800 text-sm rounded-lg flex items-start gap-2 border border-green-100 animate-in fade-in slide-in-from-top-1"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {notice}
        </div>
      )}

      <div className="space-y-3">
        <Button
          className={cn(
            'w-full h-12 text-base font-medium shadow-md transition-all',
            'hover:shadow-lg hover:-translate-y-0.5'
          )}
          disabled={!view.canReschedule}
          onClick={() => {
            setNotice('')
            setRescheduling(true)
          }}
        >
          <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
          Reprogramar turno
        </Button>
        {!view.canReschedule && view.rescheduleBlockedReason && (
          <p className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {view.rescheduleBlockedReason}
          </p>
        )}

        <Button
          variant="outline"
          className={cn(
            'w-full h-12 text-base font-medium transition-all',
            'border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground',
            'hover:border-destructive'
          )}
          disabled={!view.canCancel}
          onClick={() => setCancelOpen(true)}
        >
          <X className="w-4 h-4 mr-2" aria-hidden="true" />
          Cancelar turno
        </Button>
        {!view.canCancel && view.cancelBlockedReason && (
          <p className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {view.cancelBlockedReason}
          </p>
        )}
      </div>

      <CancelDialog
        token={token}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        hasPayment={view.paymentStatus === 'paid' || view.paymentStatus === 'pending_confirmation'}
        businessName={view.businessName ?? 'el negocio'}
        onCancelled={() => {
          setCancelOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
