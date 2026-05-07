import { getAppointments } from '@/app/actions'
import { getCurrentBusiness } from '@/app/actions/auth'
import { PendingProofsSection } from '@/components/dashboard/pending-proofs-section'
import AppointmentList from '@/components/dashboard/appointment-list'
import { createClient } from '@/utils/supabase/server'

export default async function AppointmentsPage() {
  const [result, businessResult] = await Promise.all([
    getAppointments(),
    getCurrentBusiness(),
  ])

  const appointments = result.success && result.data ? result.data : []
  const business = businessResult.success && businessResult.data ? businessResult.data : null

  let pendingProofs: {
    id: string
    client_name: string
    start_time: string
    proof_url: string
    proof_auto_approve_at: string | null
    service: { name: string } | null
  }[] = []

  if (business) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('appointments')
      .select('id, client_name, start_time, proof_url, proof_auto_approve_at, service:services(name)')
      .eq('business_id', business.id)
      .eq('payment_status', 'pending_confirmation')
      .order('proof_uploaded_at', { ascending: true })

    if (data) {
      pendingProofs = data as unknown as typeof pendingProofs
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turnos</h1>
          <p className="text-sm text-muted-foreground">
            {appointments.length === 0
              ? 'Sin turnos registrados'
              : `${appointments.length} ${appointments.length === 1 ? 'turno registrado' : 'turnos registrados'}`}
          </p>
        </div>
      </div>

      <PendingProofsSection initialProofs={pendingProofs} />

      <AppointmentList initialAppointments={appointments} />
    </div>
  )
}
