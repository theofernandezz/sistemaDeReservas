'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, Store, CalendarCheck, Globe } from 'lucide-react'

interface StepWelcomeProps {
  onStart: () => void
}

const features = [
  {
    icon: Store,
    title: 'Tu página de reservas',
    description: 'Crea tu perfil con nombre, logo y descripción para que tus clientes te reconozcan.',
  },
  {
    icon: CalendarCheck,
    title: 'Tus servicios y horarios',
    description: 'Define qué ofreces y cuándo atiendes para que los turnos se organicen solos.',
  },
  {
    icon: Globe,
    title: 'Link propio listo',
    description: 'Recibe un link único que podés compartir por WhatsApp, Instagram o donde quieras.',
  },
]

export default function StepWelcome({ onStart }: StepWelcomeProps) {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configurá tu negocio en minutos
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Te vamos a guiar paso a paso para que tu página de reservas quede lista.
        </p>
      </motion.div>

      <div className="space-y-4 max-w-lg mx-auto">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
              className="flex items-start gap-4 p-5 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="text-center"
      >
        <Button size="lg" onClick={onStart} className="min-w-50">
          Comenzar configuración
          <ArrowRight size={18} className="ml-2" />
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Te lleva menos de 3 minutos
        </p>
      </motion.div>
    </div>
  )
}
