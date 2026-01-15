'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
          <Briefcase size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-foreground mb-2">No tienes servicios aún</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Agrega los servicios que ofreces para que tus clientes puedan reservar
          </p>
          <Button onClick={addService}>
            <Plus size={16} className="mr-2" />
            Agregar primer servicio
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="bg-card border rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Servicio {index + 1}
                  </span>
                  <button
                    onClick={() => removeService(service.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
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
                    <Label htmlFor={`duration-${service.id}`} className="flex items-center gap-1">
                      <Clock size={14} />
                      Duración
                    </Label>
                    <select
                      id={`duration-${service.id}`}
                      value={service.durationMinutes}
                      onChange={(e) => updateService(service.id, 'durationMinutes', parseInt(e.target.value))}
                      className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor={`price-${service.id}`} className="flex items-center gap-1">
                      <DollarSign size={14} />
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
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addService} className="w-full">
            <Plus size={16} className="mr-2" />
            Agregar otro servicio
          </Button>
        </>
      )}

      {/* Skip hint */}
      <p className="text-sm text-muted-foreground text-center">
        💡 Puedes agregar más servicios después desde el panel de control
      </p>
    </div>
  )
}
