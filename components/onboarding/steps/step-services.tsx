'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, DollarSign, Clock, Briefcase } from 'lucide-react'

export interface ServiceData {
  id: string
  name: string
  durationMinutes: number
  price: number
}

interface StepServicesProps {
  services: ServiceData[]
  onChange: (services: ServiceData[]) => void
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
]

function generateId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default function StepServices({ services, onChange }: StepServicesProps) {
  const addService = () => {
    onChange([
      ...services,
      {
        id: generateId(),
        name: '',
        durationMinutes: 60,
        price: 0,
      },
    ])
  }

  const updateService = (id: string, field: keyof ServiceData, value: string | number) => {
    onChange(
      services.map(service =>
        service.id === id ? { ...service, [field]: value } : service
      )
    )
  }

  const removeService = (id: string) => {
    onChange(services.filter(service => service.id !== id))
  }

  return (
    <div className="space-y-6">
      {services.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No tienes servicios aún</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Agrega los servicios que ofreces para que tus clientes puedan reservar turnos online
          </p>
          <Button onClick={addService} size="lg" className="min-w-48">
            <Plus size={18} className="mr-2" />
            Agregar primer servicio
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25 }}
                  className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Servicio
                      </span>
                    </div>
                    <button
                      onClick={() => removeService(service.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-md hover:bg-destructive/5"
                      aria-label="Eliminar servicio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Service Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`name-${service.id}`}>Nombre del servicio</Label>
                    <Input
                      id={`name-${service.id}`}
                      placeholder="Ej: Corte de pelo, Consulta, Masaje..."
                      value={service.name}
                      onChange={(e) => updateService(service.id, 'name', e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Duration */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock size={14} className="text-primary" />
                        Duración
                      </Label>
                      <Select
                        value={String(service.durationMinutes)}
                        onValueChange={(value) => updateService(service.id, 'durationMinutes', parseInt(value))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <Label htmlFor={`price-${service.id}`} className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign size={14} className="text-primary" />
                        Precio
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id={`price-${service.id}`}
                          type="number"
                          min="0"
                          step="100"
                          placeholder="0"
                          value={service.price || ''}
                          onChange={(e) => updateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                          className="h-11 pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Button variant="outline" onClick={addService} className="w-full h-11 border-dashed">
            <Plus size={16} className="mr-2" />
            Agregar otro servicio
          </Button>
        </>
      )}

      {/* Skip hint */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Puedes agregar más servicios después desde el panel de control
        </p>
      </div>
    </div>
  )
}
