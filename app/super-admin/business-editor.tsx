'use client'

import { useState, useTransition } from 'react'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import StepBusinessInfo, { BusinessInfoData } from '@/components/onboarding/steps/step-business-info'
import StepServices, { ServiceData } from '@/components/onboarding/steps/step-services'
import StepHours, { HoursData } from '@/components/onboarding/steps/step-hours'
import StepPayments, { PaymentData } from '@/components/onboarding/steps/step-payments'
import {
  updateSuperAdminBusinessInfo,
  updateSuperAdminServices,
  updateSuperAdminBusinessHours,
  updateSuperAdminBusinessPayment,
  SuperAdminBusinessDetails,
} from '@/app/actions/super-admin'
import { Business, BusinessSettings } from '@/types/database.types'

interface BusinessEditorProps {
  details: SuperAdminBusinessDetails
  onBack: () => void
}

type Tab = 'info' | 'services' | 'hours' | 'payments'

const TABS: { id: Tab; label: string }[] = [
  { id: 'info', label: 'Info' },
  { id: 'services', label: 'Servicios' },
  { id: 'hours', label: 'Horarios' },
  { id: 'payments', label: 'Pagos' },
]

const DEFAULT_SCHEDULE = [
  { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 1, dayName: 'Lunes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, dayName: 'Martes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, dayName: 'Miércoles', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, dayName: 'Jueves', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, dayName: 'Viernes', isOpen: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, dayName: 'Sábado', isOpen: false, startTime: '09:00', endTime: '14:00' },
]

function buildInitialInfo(business: Business): BusinessInfoData {
  return {
    name: business.name,
    slug: business.slug,
    logo: business.logo,
    description: business.description || '',
  }
}

function buildInitialHours(settings: BusinessSettings): HoursData {
  const schedule = settings.businessHours
    ? DEFAULT_SCHEDULE.map(def => {
        const saved = settings.businessHours!.find(h => h.dayOfWeek === def.dayOfWeek)
        return saved ? { ...def, isOpen: saved.isOpen, startTime: saved.startTime, endTime: saved.endTime } : def
      })
    : DEFAULT_SCHEDULE

  return { schedule, slotInterval: settings.slotInterval || 30 }
}

function buildInitialPayment(settings: BusinessSettings): PaymentData {
  const mode = settings.paymentFlowMode || 'none'
  return {
    mode: mode === 'manual_transfer' ? 'manual_transfer' : mode === 'mercadopago' ? 'mercadopago' : 'none',
    manualTransfer: {
      alias: settings.manualTransfer?.alias || '',
      cvu: settings.manualTransfer?.cvu || '',
      accountHolder: settings.manualTransfer?.accountHolder || '',
    },
  }
}

export function BusinessEditor({ details, onBack }: BusinessEditorProps) {
  const { business, services: rawServices } = details
  const { success: showSuccess, error: showError } = useToast()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>('info')

  const [infoData, setInfoData] = useState<BusinessInfoData>(() => buildInitialInfo(business))
  const [servicesData, setServicesData] = useState<ServiceData[]>(() =>
    rawServices.map(s => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, price: s.price }))
  )
  const [hoursData, setHoursData] = useState<HoursData>(() => buildInitialHours(business.settings))
  const [paymentData, setPaymentData] = useState<PaymentData>(() => buildInitialPayment(business.settings))

  const handleSave = () => {
    startTransition(async () => {
      let result: { success: boolean; error?: string }

      if (activeTab === 'info') {
        result = await updateSuperAdminBusinessInfo(business.id, {
          name: infoData.name,
          slug: infoData.slug,
          description: infoData.description,
          logo: infoData.logo,
        })
      } else if (activeTab === 'services') {
        result = await updateSuperAdminServices(
          business.id,
          servicesData
            .filter(s => s.name.trim())
            .map(s => ({ name: s.name, durationMinutes: s.durationMinutes, price: s.price }))
        )
      } else if (activeTab === 'hours') {
        result = await updateSuperAdminBusinessHours(business.id, {
          schedule: hoursData.schedule,
          slotInterval: hoursData.slotInterval,
        })
      } else {
        result = await updateSuperAdminBusinessPayment(business.id, paymentData)
      }

      if (result.success) {
        showSuccess('Guardado correctamente')
      } else {
        showError(result.error || 'Error al guardar')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </button>
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="bg-white text-black hover:bg-zinc-200 font-medium"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          Guardar
        </Button>
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        {/* Business name header */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800">
          <h2 className="text-white font-semibold">{business.name}</h2>
          <p className="text-zinc-500 text-sm">/{business.slug}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === 'info' && (
            <StepBusinessInfo data={infoData} onChange={setInfoData} />
          )}
          {activeTab === 'services' && (
            <StepServices services={servicesData} onChange={setServicesData} />
          )}
          {activeTab === 'hours' && (
            <StepHours data={hoursData} onChange={setHoursData} />
          )}
          {activeTab === 'payments' && (
            <StepPayments data={paymentData} onChange={setPaymentData} />
          )}
        </div>
      </div>
    </div>
  )
}
