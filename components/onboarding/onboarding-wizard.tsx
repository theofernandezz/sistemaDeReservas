'use client'

import { useState, useCallback, useMemo, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, Store, Briefcase, Clock, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/components/ui/confirm-dialog'
import StepWelcome from './steps/step-welcome'
import StepBusinessInfo, { BusinessInfoData } from './steps/step-business-info'
import StepServices, { ServiceData } from './steps/step-services'
import StepHours, { HoursData } from './steps/step-hours'
import StepSummary from './steps/step-summary'
import { completeOnboarding } from '@/app/actions/onboarding'

const FORM_STEPS = [
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

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
}

export default function OnboardingWizard() {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
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
        setCurrentStep(parsed.step || 0)
        setHasDraft(true)
      }
    } catch (e) {
      console.error('Error loading draft:', e)
    }
  }, [])

  // Save draft to localStorage whenever data or step changes
  useEffect(() => {
    if (data.business.name || data.services.length > 0 || currentStep > 0) {
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
      case 0:
        return true
      case 1:
        return data.business.name.trim().length >= 2 && data.business.slug.trim().length >= 2
      case 2:
        return true // Services are optional
      case 3:
        return data.hours.schedule.some((day: { isOpen: boolean }) => day.isOpen)
      case 4:
        return true // Already validated
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
    if (currentStep < 4) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleStepClick = (stepId: number) => {
    if (loading) return
    if (currentStep === 4) {
      setDirection(stepId < currentStep ? -1 : 1)
      setCurrentStep(stepId)
    } else if (currentStep > stepId) {
      setDirection(-1)
      setCurrentStep(stepId)
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
        localStorage.removeItem(STORAGE_KEY)
        router.push('/dashboard')
      } else {
        setError(result.error || 'Error al completar la configuración')
      }
    } catch {
      setError('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleResetDraft = () => {
    confirm({
      title: '¿Empezar de nuevo?',
      description: 'Se perderá todo tu progreso actual. Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmText: 'Sí, empezar de nuevo',
      cancelText: 'Cancelar',
      onConfirm: () => {
        localStorage.removeItem(STORAGE_KEY)
        setData(INITIAL_DATA)
        setCurrentStep(0)
        setHasDraft(false)
      },
    })
  }

  const isFormStep = currentStep >= 1 && currentStep <= 3
  const progressLabel = isFormStep
    ? `Paso ${currentStep} de ${FORM_STEPS.length}`
    : currentStep === 4
      ? 'Revisá tu configuración'
      : ''

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress - visible on form steps and summary */}
      {(isFormStep || currentStep === 4) && (
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {progressLabel}
              </span>
              {hasDraft && currentStep > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDraft}
                  disabled={loading}
                  className="text-muted-foreground h-8"
                >
                  <RotateCcw size={14} className="mr-1" />
                  Empezar de nuevo
                </Button>
              )}
            </div>

            {/* Step Indicators */}
            <div className="flex items-start">
              {FORM_STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id || currentStep === 4
                const isClickable = !loading && (isCompleted || currentStep === 4)

                return (
                  <Fragment key={step.id}>
                    {/* Step node */}
                    <div className="flex flex-col items-center gap-2 flex-1 basis-0 min-w-0">
                      <button
                        onClick={() => isClickable && handleStepClick(step.id)}
                        disabled={!isClickable}
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0',
                          isCompleted && 'bg-primary text-primary-foreground',
                          isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                          !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                          isClickable && 'cursor-pointer hover:scale-105',
                          !isClickable && 'cursor-default'
                        )}
                      >
                        {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                      </button>
                      <span
                        className={cn(
                          'text-xs font-medium whitespace-nowrap',
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </span>
                    </div>

                    {/* Connector line */}
                    {index < FORM_STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mt-5 mx-2 basis-0 min-w-0">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isCompleted ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Title block for form steps */}
        {isFormStep && (
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {FORM_STEPS[currentStep - 1].title}
                </h1>
                <p className="text-muted-foreground">
                  {currentStep === 1 && 'Cuéntanos sobre tu negocio para personalizar tu página'}
                  {currentStep === 2 && 'Agrega los servicios que ofreces (puedes hacerlo después)'}
                  {currentStep === 3 && 'Define tus horarios de atención'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Step Content with transitions */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {currentStep === 0 && (
                <StepWelcome onStart={handleNext} />
              )}
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
              {currentStep === 4 && (
                <StepSummary
                  business={data.business}
                  services={data.services}
                  hours={data.hours}
                  loading={loading}
                  onBack={handleBack}
                  onConfirm={handleComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation - only on form steps */}
        {isFormStep && (
          <div className="flex items-center justify-between pt-8 border-t mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeft size={16} className="mr-2" />
              Atrás
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed || loading}
              >
                Continuar
                <ArrowRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed || loading}
              >
                Revisar y publicar
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
