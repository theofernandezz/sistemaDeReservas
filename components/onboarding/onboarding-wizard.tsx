'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Loader2, Check, Store, Briefcase, Clock, Sparkles, RotateCcw } from 'lucide-react'
import StepBusinessInfo, { BusinessInfoData } from './steps/step-business-info'
import StepServices, { ServiceData } from './steps/step-services'
import StepHours, { HoursData } from './steps/step-hours'
import { completeOnboarding } from '@/app/actions/onboarding'

const STEPS = [
  { id: 1, title: 'Tu Negocio', icon: Store, description: 'Información básica' },
  { id: 2, title: 'Servicios', icon: Briefcase, description: 'Qué ofreces' },
  { id: 3, title: 'Horarios', icon: Clock, description: 'Cuándo atiendes' },
]

interface OnboardingData {
  business: BusinessInfoData
  services: ServiceData[]
  hours: HoursData
}

const INITIAL_DATA: OnboardingData = {
  business: {
    name: '',
    slug: '',
    logo: null,
    description: '',
  },
  services: [],
  hours: {
    schedule: [
      { dayOfWeek: 1, dayName: 'Lunes', isOpen: true, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 2, dayName: 'Martes', isOpen: true, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 3, dayName: 'Miércoles', isOpen: true, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 4, dayName: 'Jueves', isOpen: true, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 5, dayName: 'Viernes', isOpen: true, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 6, dayName: 'Sábado', isOpen: false, startTime: '10:00', endTime: '14:00' },
      { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, startTime: '10:00', endTime: '14:00' },
    ],
    slotInterval: 30,
  },
}

const STORAGE_KEY = 'onboarding-draft'

export default function OnboardingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setData(parsed.data)
        setCurrentStep(parsed.step || 1)
        setHasDraft(true)
      }
    } catch (e) {
      console.error('Error loading draft:', e)
    }
  }, [])

  // Save draft to localStorage whenever data or step changes
  useEffect(() => {
    if (data.business.name || data.services.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step: currentStep }))
      } catch (e) {
        console.error('Error saving draft:', e)
      }
    }
  }, [data, currentStep])

  // Validate current step
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return data.business.name.trim().length >= 2 && data.business.slug.trim().length >= 2
      case 2:
        return true // Services are optional
      case 3:
        return data.hours.schedule.some((day: { isOpen: boolean }) => day.isOpen) // At least one day open
      default:
        return false
    }
  }, [currentStep, data])

  const updateBusinessInfo = useCallback((info: BusinessInfoData) => {
    setData(prev => ({ ...prev, business: info }))
  }, [])

  const updateServices = useCallback((services: ServiceData[]) => {
    setData(prev => ({ ...prev, services }))
  }, [])

  const updateHours = useCallback((hours: HoursData) => {
    setData(prev => ({ ...prev, hours }))
  }, [])

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await completeOnboarding({
        businessName: data.business.name,
        slug: data.business.slug,
        logo: data.business.logo,
        description: data.business.description,
        services: data.services.map(s => ({
          name: s.name,
          durationMinutes: s.durationMinutes,
          price: s.price,
        })),
        businessHours: data.hours.schedule,
        slotInterval: data.hours.slotInterval,
      })

      if (result.success) {
        // Clear draft on successful completion
        localStorage.removeItem(STORAGE_KEY)
        router.push('/dashboard')
      } else {
        setError(result.error || 'Error al completar la configuración')
      }
    } catch (err) {
      setError('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleResetDraft = () => {
    if (confirm('¿Estás seguro de que quieres empezar de nuevo? Se perderá tu progreso actual.')) {
      localStorage.removeItem(STORAGE_KEY)
      setData(INITIAL_DATA)
      setCurrentStep(1)
      setHasDraft(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                        ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                        ${isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                        ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                      `}
                    >
                      {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-colors ${isCompleted ? 'bg-primary' : 'bg-muted'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {STEPS[currentStep - 1].title}
              </h1>
              <p className="text-muted-foreground">
                {currentStep === 1 && 'Cuéntanos sobre tu negocio para personalizar tu página'}
                {currentStep === 2 && 'Agrega los servicios que ofreces (puedes hacerlo después)'}
                {currentStep === 3 && 'Define tus horarios de atención'}
              </p>
            </div>
            {hasDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDraft}
                disabled={loading}
                className="text-muted-foreground"
              >
                <RotateCcw size={14} className="mr-1" />
                Empezar de nuevo
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <StepBusinessInfo
              data={data.business}
              onChange={updateBusinessInfo}
            />
          )}
          {currentStep === 2 && (
            <StepServices
              services={data.services}
              onChange={updateServices}
            />
          )}
          {currentStep === 3 && (
            <StepHours
              data={data.hours}
              onChange={updateHours}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
          >
            <ArrowLeft size={16} className="mr-2" />
            Atrás
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed || loading}
            >
              Continuar
              <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed || loading}
              className="bg-linear-to-r from-primary to-primary/80"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  Comenzar a usar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
