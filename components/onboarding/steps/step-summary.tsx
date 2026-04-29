'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Sparkles, Store, Briefcase, Clock, CheckCircle2 } from 'lucide-react'
import type { BusinessInfoData } from './step-business-info'
import type { ServiceData } from './step-services'
import type { HoursData } from './step-hours'

interface StepSummaryProps {
  business: BusinessInfoData
  services: ServiceData[]
  hours: HoursData
  loading: boolean
  onBack: () => void
  onConfirm: () => void
}

function formatScheduleSummary(schedule: HoursData['schedule']) {
  const openDays = schedule.filter(d => d.isOpen)
  if (openDays.length === 0) return 'Sin horarios definidos'

  const groups: { days: string[]; start: string; end: string }[] = []

  openDays.forEach((day) => {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.start === day.startTime && lastGroup.end === day.endTime) {
      lastGroup.days.push(day.dayName)
    } else {
      groups.push({ days: [day.dayName], start: day.startTime, end: day.endTime })
    }
  })

  return groups.map(g => `${g.days.join(', ')}: ${g.start} a ${g.end}`).join(' · ')
}

export default function StepSummary({ business, services, hours, loading, onBack, onConfirm }: StepSummaryProps) {
  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || window.location.host)
    : 'reserva.com'

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold text-foreground">Revisá tu configuración</h2>
        <p className="text-muted-foreground">
          Así es como van a ver tu negocio tus clientes
        </p>
      </motion.div>

      {/* Business Profile Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-card border border-border/60 rounded-xl p-6 shadow-sm"
      >
        {/* Header with logo + name */}
        <div className="flex items-center gap-4 mb-5">
          {business.logo ? (
            <img src={business.logo} alt="" className="w-16 h-16 rounded-xl object-cover border shadow-sm" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store size={28} className="text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">{business.name || 'Tu Negocio'}</h3>
            <p className="text-sm text-muted-foreground">{baseUrl}/{business.slug || 'tu-negocio'}</p>
          </div>
        </div>

        {business.description && (
          <p className="text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
            {business.description}
          </p>
        )}
      </motion.div>

      {/* Services Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Briefcase size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Servicios</h3>
            <p className="text-sm text-muted-foreground">
              {services.length > 0 ? `${services.length} servicio${services.length > 1 ? 's' : ''}` : 'Sin servicios'}
            </p>
          </div>
        </div>

        {services.length > 0 ? (
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between text-sm px-4 py-3 rounded-lg bg-muted/40 border border-border/30"
              >
                <span className="font-medium text-foreground">{service.name || 'Servicio sin nombre'}</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-xs font-medium text-primary">
                    {service.durationMinutes} min
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                    ${service.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic px-1">
            Sin servicios configurados todavía. Podés agregarlos después.
          </p>
        )}
      </motion.div>

      {/* Hours Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Horarios de atención</h3>
            <p className="text-sm text-muted-foreground">
              Intervalo: {hours.slotInterval} minutos
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {formatScheduleSummary(hours.schedule).split(' · ').map((line, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg bg-muted/40 border border-border/30"
            >
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span className="text-foreground">{line}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Ready state */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <CheckCircle2 size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Todo listo para publicar</p>
          <p className="text-sm text-muted-foreground">Tu página estará disponible en segundos</p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center justify-between pt-4"
      >
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          <ArrowLeft size={16} className="mr-2" />
          Atrás
        </Button>

        <Button
          size="lg"
          onClick={onConfirm}
          disabled={loading}
          className="shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Sparkles size={16} className="mr-2" />
              Publicar mi página
            </>
          )}
        </Button>
      </motion.div>
    </div>
  )
}
