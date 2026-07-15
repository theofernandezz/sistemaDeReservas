'use client'

import { useRouter } from 'next/navigation'
import { FileCheck } from 'lucide-react'
import { ProofReviewCard } from '@/components/dashboard/proof-review-card'

interface PendingProof {
  id: string
  client_name: string
  start_time: string
  proof_url: string
  service: { name: string } | null
}

interface PendingProofsSectionProps {
  initialProofs: PendingProof[]
}

export function PendingProofsSection({ initialProofs }: PendingProofsSectionProps) {
  const router = useRouter()

  if (initialProofs.length === 0) return null

  function handleAction() {
    router.refresh()
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">Comprobantes por revisar</h2>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-500/30">
          {initialProofs.length}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 px-4 py-3">
        <FileCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-900 dark:text-amber-100">
          {initialProofs.length === 1
            ? 'Hay 1 comprobante esperando tu revisión.'
            : `Hay ${initialProofs.length} comprobantes esperando tu revisión.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialProofs.map((proof) => (
          <ProofReviewCard
            key={proof.id}
            appointmentId={proof.id}
            clientName={proof.client_name}
            serviceName={proof.service?.name ?? 'Turno'}
            startTime={proof.start_time}
            proofUrl={proof.proof_url}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  )
}
