import { redirect } from 'next/navigation'
import { getCurrentBusiness, isSuperAdmin, getAllBusinesses } from '@/app/actions/auth'
import { BusinessProvider } from '@/lib/business-context'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await getCurrentBusiness()
  const isAdmin = await isSuperAdmin()

  if (!result.success || !result.data) {
    // Si es super admin sin negocio, redirigir al panel de admin
    if (isAdmin) {
      redirect('/super-admin')
    }
    // Usuario normal sin negocio, redirigir a crear uno
    redirect('/signup')
  }

  const business = result.data

  // Obtener todos los negocios solo si es super admin
  let allBusinesses = null
  if (isAdmin) {
    const businessesResult = await getAllBusinesses()
    if (businessesResult.success) {
      allBusinesses = businessesResult.data
    }
  }

  return (
    <BusinessProvider business={business}>
      <div className="min-h-[100dvh] bg-secondary/30 flex flex-col md:flex-row text-foreground font-sans">
        <DashboardSidebar
          business={business}
          allBusinesses={allBusinesses}
          isSuperAdmin={isAdmin}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          <div className="max-w-4xl mx-auto">
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </div>
        </main>
      </div>
    </BusinessProvider>
  )
}

