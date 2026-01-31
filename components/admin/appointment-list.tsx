'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, User, Phone, Mail, Check, X, CheckCircle2, Trash2, Loader2 } from 'lucide-react'
import { AppointmentWithService } from '@/types/database.types'
import { updateAppointmentStatus, deleteAppointment } from '@/app/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface AppointmentListProps {
  initialAppointments: AppointmentWithService[]
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<{ size?: number }> }> = {
  pending: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  confirmed: { label: 'Confirmada', variant: 'default', icon: Check },
  completed: { label: 'Completada', variant: 'outline', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', variant: 'destructive', icon: X },
}

export default function AppointmentList({ initialAppointments }: AppointmentListProps) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [filter, setFilter] = useState<string>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Count appointments by status
  const counts = {
    all: initialAppointments.length,
    pending: initialAppointments.filter(a => a.status === 'pending').length,
    confirmed: initialAppointments.filter(a => a.status === 'confirmed').length,
    completed: initialAppointments.filter(a => a.status === 'completed').length,
    cancelled: initialAppointments.filter(a => a.status === 'cancelled').length,
  }

  const filteredAppointments = filter === 'all'
    ? initialAppointments
    : initialAppointments.filter(apt => apt.status === filter)

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLoadingId(id)
    await updateAppointmentStatus(id, newStatus)
    router.refresh()
    setLoadingId(null)
  }

  const handleDelete = (id: string) => {
    confirm({
      title: 'Eliminar Cita',
      description: '¿Estás seguro de eliminar esta cita? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(id)
        await deleteAppointment(id)
        router.refresh()
        setDeletingId(null)
      }
    })
  }

  if (initialAppointments.length === 0) {
    return (
      <div className="bg-card rounded-xl p-8 text-center border border-border shadow-sm">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-serif font-semibold text-foreground mb-2">No hay citas</h3>
        <p className="text-muted-foreground">
          Las citas aparecerán aquí cuando los clientes reserven.
        </p>
      </div>
    )
  }

  const filterTabs = [
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'completed', label: 'Completadas' },
    { key: 'cancelled', label: 'Canceladas' },
  ]

  return (
    <div className="space-y-4">
      {/* Filters with counts */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filter === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
          >
            {label}
            {counts[key as keyof typeof counts] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === key
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
                }`}>
                {counts[key as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredAppointments.map((appointment) => {
          const config = statusConfig[appointment.status] || statusConfig.pending
          const StatusIcon = config.icon
          const startDate = new Date(appointment.start_time)
          const isFinished = appointment.status === 'completed' || appointment.status === 'cancelled'

          return (
            <div
              key={appointment.id}
              className={`bg-card p-4 rounded-xl border border-border shadow-sm ${isFinished ? 'opacity-60' : ''
                }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Date/Time Block */}
                <div className="shrink-0 bg-secondary/50 rounded-lg p-3 text-center min-w-[80px]">
                  <div className="text-2xl font-bold text-primary">
                    {format(startDate, 'd')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {format(startDate, 'MMM', { locale: es })}
                  </div>
                  <div className="text-sm font-medium mt-1">
                    {format(startDate, 'HH:mm')}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Service & Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold font-serif text-lg text-foreground">
                      {appointment.service?.name || 'Servicio'}
                    </h3>
                    <Badge variant={config.variant} className="flex items-center gap-1">
                      <StatusIcon size={12} />
                      {config.label}
                    </Badge>
                  </div>

                  {/* Client Info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {appointment.client_name}
                    </span>
                    {appointment.client_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {appointment.client_phone}
                      </span>
                    )}
                    {appointment.client_email && (
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {appointment.client_email}
                      </span>
                    )}
                  </div>

                  {/* Price & Duration */}
                  <div className="flex gap-3 text-sm">
                    <span className="text-foreground font-medium">
                      ${appointment.service?.price}
                    </span>
                    <span className="text-muted-foreground">
                      {appointment.service?.duration_minutes} min
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2">
                  {loadingId === appointment.id ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {appointment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                            className="flex-1 sm:flex-none"
                          >
                            <Check size={14} className="mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                            className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                          >
                            <X size={14} className="mr-1" />
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
                            className="flex-1 sm:flex-none"
                          >
                            <CheckCircle2 size={14} className="mr-1" />
                            Completar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                            className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                          >
                            <X size={14} className="mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {/* Delete button for completed/cancelled */}
                      {isFinished && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(appointment.id)}
                          disabled={deletingId === appointment.id}
                          className="flex-1 sm:flex-none text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === appointment.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Trash2 size={14} className="mr-1" />
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

      {filteredAppointments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay citas con el filtro seleccionado.
        </div>
      )}
    </div>
  )
}
