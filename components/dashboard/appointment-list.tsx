'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, User, Phone, Mail, Check, X, CheckCircle2, Trash2, Loader2, DollarSign } from 'lucide-react'
import { AppointmentWithService } from '@/types/database.types'
import { updateAppointmentStatus, deleteAppointment } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

interface AppointmentListProps {
  initialAppointments: AppointmentWithService[]
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  confirmed: {
    label: 'Confirmada',
    dot: 'bg-emerald-400 animate-pulse',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  completed: {
    label: 'Completada',
    dot: 'bg-muted-foreground/40',
    badge: 'bg-secondary text-muted-foreground border-border',
  },
  cancelled: {
    label: 'Cancelada',
    dot: 'bg-destructive/60',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
  },
} as const

const FILTER_TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
] as const

export default function AppointmentList({ initialAppointments }: AppointmentListProps) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [filter, setFilter] = useState<string>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const counts = {
    all: initialAppointments.length,
    pending: initialAppointments.filter(a => a.status === 'pending').length,
    confirmed: initialAppointments.filter(a => a.status === 'confirmed').length,
    completed: initialAppointments.filter(a => a.status === 'completed').length,
    cancelled: initialAppointments.filter(a => a.status === 'cancelled').length,
  }

  const filtered = filter === 'all'
    ? initialAppointments
    : initialAppointments.filter(a => a.status === filter)

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLoadingId(id)
    await updateAppointmentStatus(id, newStatus)
    router.refresh()
    setLoadingId(null)
  }

  const handleDelete = (id: string) => {
    confirm({
      title: 'Eliminar turno',
      description: '¿Estás seguro? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(id)
        await deleteAppointment(id)
        router.refresh()
        setDeletingId(null)
      },
    })
  }

  if (initialAppointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center mb-4">
          <Clock className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Sin turnos aún</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Los turnos aparecerán acá cuando los clientes reserven desde tu página pública.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 bg-secondary/40 backdrop-blur-md rounded-full p-1 border border-white/5 shadow-sm w-fit flex-wrap">
        {FILTER_TABS.map(({ key, label }) => {
          const count = counts[key as keyof typeof counts]
          const isActive = filter === key
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40'
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(appointment => {
          const config = STATUS_CONFIG[appointment.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
          const startDate = new Date(appointment.start_time)
          const isFinished = appointment.status === 'completed' || appointment.status === 'cancelled'
          const isLoading = loadingId === appointment.id
          const isDeleting = deletingId === appointment.id

          return (
            <div
              key={appointment.id}
              className={cn(
                'bg-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4 sm:p-5',
                'shadow-sm transition-all duration-300',
                'hover:shadow-md hover:-translate-y-0.5 hover:border-primary/10',
                isFinished && 'opacity-50 grayscale-[30%]'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Date block */}
                <div className="shrink-0 w-16 h-16 rounded-xl bg-secondary/60 border border-border/40 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-primary leading-none">
                    {format(startDate, 'd')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">
                    {format(startDate, 'MMM', { locale: es })}
                  </span>
                  <span className="text-xs font-medium text-foreground/80 mt-0.5">
                    {format(startDate, 'HH:mm')}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      {appointment.service?.name ?? 'Servicio'}
                    </h3>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
                      config.badge
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
                      {config.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User size={13} />
                      {appointment.client_name}
                    </span>
                    {appointment.client_phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} />
                        {appointment.client_phone}
                      </span>
                    )}
                    {appointment.client_email && (
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} />
                        {appointment.client_email}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      {appointment.service?.price?.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {appointment.service?.duration_minutes} min
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {appointment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                            className="h-8 px-3 text-xs rounded-full"
                          >
                            <Check size={13} className="mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                            className="h-8 px-3 text-xs rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                          >
                            <X size={13} className="mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(appointment.id, 'completed')}
                            className="h-8 px-3 text-xs rounded-full"
                          >
                            <CheckCircle2 size={13} className="mr-1" />
                            Completar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                            className="h-8 px-3 text-xs rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                          >
                            <X size={13} className="mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {isFinished && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(appointment.id)}
                          disabled={isDeleting}
                          className="h-8 px-3 text-xs rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          {isDeleting ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <>
                              <Trash2 size={13} className="mr-1" />
                              Eliminar
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-10 text-sm text-muted-foreground">
          No hay turnos con ese filtro.
        </p>
      )}
    </div>
  )
}
