import { getAppointments } from '@/app/actions'
import { getCurrentBusiness } from '@/app/actions/auth'
import AppointmentList from '@/components/admin/appointment-list'
import { PendingProofsSection } from '@/components/dashboard/pending-proofs-section'
import { createClient } from '@/utils/supabase/server'

export default async function AppointmentsPage() {
  const result = await getAppointments()
  const appointments = result.success && result.data ? result.data : []

  const businessResult = await getCurrentBusiness()
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Citas</h1>
        <p className="text-sm text-muted-foreground">{appointments.length} citas en total</p>
      </div>

      <PendingProofsSection initialProofs={pendingProofs} />

      <AppointmentList initialAppointments={appointments} />
    </div>
  )
}
