'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, X, Sparkles, Zap, Building2, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  TEAMS: 'teams',
} as const

type PlanType = typeof PLANS[keyof typeof PLANS]

interface PlanFeature {
  text: string
  included: boolean
  highlight?: boolean
}

interface Plan {
  id: PlanType
  name: string
  description: string
  price: number
  originalPrice?: number
  icon: typeof Sparkles
  popular?: boolean
  features: PlanFeature[]
  cta: string
  ctaHref: string
}

const plans: Plan[] = [
  {
    id: PLANS.FREE,
    name: 'Inicial',
    description: 'Para individuos que recién comienzan.',
    price: 0,
    icon: Sparkles,
    features: [
      { text: '50 reservas mensuales', included: true },
      { text: '1 calendario', included: true },
      { text: 'Recordatorios email', included: true },
      { text: 'Página de reservas', included: true },
      { text: 'Pagos online', included: false },
      { text: 'WhatsApp Reminders', included: false },
    ],
    cta: 'Empezar Gratis',
    ctaHref: '/signup',
  },
  {
    id: PLANS.PRO,
    name: 'Pro',
    description: 'Para profesionales con alto volumen.',
    price: 0,
    originalPrice: 15,
    icon: Zap,
    popular: true,
    features: [
      { text: 'Reservas ilimitadas', included: true, highlight: true },
      { text: '3 calendarios', included: true },
      { text: 'Pagos online (Stripe/MP)', included: true, highlight: true },
      { text: 'WhatsApp Reminders', included: true, highlight: true },
      { text: 'Custom Branding', included: true },
      { text: 'Analytics básicos', included: true },
    ],
    cta: 'Comenzar Ahora',
    ctaHref: '/signup',
  },
  {
    id: PLANS.TEAMS,
    name: 'Equipos',
    description: 'Para clínicas y agencias.',
    price: 0,
    originalPrice: 49,
    icon: Building2,
    features: [
      { text: 'Todo en Pro', included: true },
      { text: '5 miembros del equipo', included: true, highlight: true },
      { text: 'Admin dashboard', included: true },
      { text: 'API Access', included: true, highlight: true },
      { text: 'Soporte prioritario', included: true },
      { text: 'Onboarding dedicado', included: true },
    ],
    cta: 'Contactar Ventas',
    ctaHref: '/signup',
  },
]

const comparisonFeatures = [
  { name: 'Reservas Mensuales', free: '50', pro: 'Ilimitadas', teams: 'Ilimitadas' },
  { name: 'Calendarios Conectados', free: '1', pro: '3', teams: 'Todo el equipo' },
  { name: 'Pagos Online (Stripe/MP)', free: false, pro: true, teams: true },
  { name: 'Marca blanca (Checkout)', free: false, pro: true, teams: true },
  { name: 'WhatsApp Reminders', free: false, pro: true, teams: true },
  { name: 'API Access', free: false, pro: false, teams: true },
  { name: 'Miembros del equipo', free: '1', pro: '1', teams: '5' },
  { name: 'Soporte prioritario', free: false, pro: false, teams: true },
]

function PricingCard({ plan, index }: { plan: Plan; index: number }) {
  const Icon = plan.icon

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border p-8 transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5',
        plan.popular
          ? 'border-primary/50 bg-linear-to-b from-primary/10 to-primary/5 scale-[1.02]'
          : 'border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30'
      )}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25">
            <Gift className="h-3.5 w-3.5" />
            EARLY ACCESS
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              plan.popular
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h3
            className={cn(
              'text-xl font-semibold',
              plan.popular && 'text-primary'
            )}
          >
            {plan.name}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      {/* Price - Fixed height to align across cards */}
      <div className="mb-6 h-18">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
          <span className="text-muted-foreground">/mes</span>
          {plan.originalPrice && (
            <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
              Gratis por ahora
            </span>
          )}
        </div>
        {plan.originalPrice ? (
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="line-through">${plan.originalPrice}/mes</span>
            <span className="ml-2 text-green-500">• Durante Early Access</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Siempre gratis
          </p>
        )}
      </div>

      {/* CTA Button */}
      <Button
        className={cn(
          'mb-6 w-full rounded-xl transition-all duration-200',
          plan.popular
            ? 'bg-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
            : 'hover:bg-primary hover:text-primary-foreground'
        )}
        variant={plan.popular ? 'default' : 'outline'}
        size="lg"
        asChild
      >
        <Link href={plan.ctaHref}>{plan.cta}</Link>
      </Button>

      {/* Features - flex-1 to push content and equalize card heights */}
      <div className="flex-1 space-y-3">
        {plan.features.map((feature, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 text-sm transition-colors',
              !feature.included && 'text-muted-foreground/50'
            )}
          >
            {feature.included ? (
              <Check
                className={cn(
                  'h-4 w-4 shrink-0',
                  feature.highlight ? 'text-green-500' : 'text-primary'
                )}
              />
            ) : (
              <X className="h-4 w-4 shrink-0 text-muted-foreground/30" />
            )}
            <span className={cn(feature.highlight && 'font-medium')}>
              {feature.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 text-primary" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/30" />
    )
  }
  return <span>{value}</span>
}

function ComparisonTable() {
  return (
    <>
      {/* Mobile: Card-based layout */}
      <div className="space-y-3 md:hidden">
        {comparisonFeatures.map((feature) => (
          <div
            key={feature.name}
            className={cn(
              "rounded-xl border border-border/50 bg-card/30 p-4 backdrop-blur-sm",
              "transition-colors duration-200 hover:bg-card/50"
            )}
          >
            <h4 className="mb-3 font-medium">{feature.name}</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className={cn(
                "flex flex-col items-center gap-1 rounded-lg bg-muted/30 p-2",
                "transition-colors duration-150"
              )}>
                <span className="text-xs text-muted-foreground">Inicial</span>
                <FeatureValue value={feature.free} />
              </div>
              <div className={cn(
                "flex flex-col items-center gap-1 rounded-lg bg-primary/10 p-2",
                "transition-colors duration-150"
              )}>
                <span className="text-xs font-medium text-primary">Pro</span>
                <FeatureValue value={feature.pro} />
              </div>
              <div className={cn(
                "flex flex-col items-center gap-1 rounded-lg bg-muted/30 p-2",
                "transition-colors duration-150"
              )}>
                <span className="text-xs text-muted-foreground">Equipos</span>
                <FeatureValue value={feature.teams} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Traditional table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="p-4 pl-6 text-left font-medium text-muted-foreground">
                Funcionalidad
              </th>
              <th className="p-4 text-center font-medium text-muted-foreground">
                Inicial
              </th>
              <th className="p-4 text-center font-medium text-primary">Pro</th>
              <th className="p-4 text-center font-medium text-muted-foreground">
                Equipos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {comparisonFeatures.map((feature) => (
              <tr
                key={feature.name}
                className="bg-background/50 transition-colors hover:bg-muted/20"
              >
                <td className="p-4 pl-6 font-medium">{feature.name}</td>
                <td className="p-4 text-center">
                  <span className="flex justify-center">
                    <FeatureValue value={feature.free} />
                  </span>
                </td>
                <td className="p-4 text-center font-medium">
                  <span className="flex justify-center">
                    <FeatureValue value={feature.pro} />
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className="flex justify-center">
                    <FeatureValue value={feature.teams} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function PricingPage() {
  return (
    <div className="relative pb-24 pt-16">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-125 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="container relative px-4">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-3xl space-y-6 text-center">
          {/* Early Access Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500">
            <Gift className="h-4 w-4" />
            Early Access - Todo gratis por tiempo limitado
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Precios{' '}
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              simples
            </span>
          </h1>

          <p className="text-lg text-muted-foreground md:text-xl">
            Estamos en fase de crecimiento. Comienza gratis y ayúdanos a mejorar.
            <br />
            <span className="text-sm">
              Los precios regulares aplicarán cuando salgamos de Early Access.
            </span>
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mb-24 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold">
            Comparación detallada
          </h2>
          <ComparisonTable />
        </div>

        {/* FAQ or CTA Section */}
        <div className="mx-auto mt-24 max-w-2xl text-center">
          <div className="rounded-2xl border border-border/50 bg-linear-to-b from-card/80 to-card/40 p-8 backdrop-blur-sm">
            <h3 className="mb-2 text-xl font-semibold">
              ¿Tienes preguntas sobre el pricing?
            </h3>
            <p className="mb-6 text-muted-foreground">
              Estamos aquí para ayudarte a elegir el plan perfecto para tu negocio.
            </p>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="mailto:soporte@tusitio.com">Contactar Soporte</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
