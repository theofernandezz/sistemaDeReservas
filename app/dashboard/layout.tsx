import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCachedCurrentBusiness, getCachedIsSuperAdmin, getCachedAllBusinesses } from '@/app/actions/cached'
import { BusinessProvider } from '@/lib/business-context'
import { DashboardNavbar } from '@/components/dashboard/navbar'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Gestioná tus reservas, servicios y disponibilidad desde tu panel de control.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [result, isAdmin] = await Promise.all([getCachedCurrentBusiness(), getCachedIsSuperAdmin()])

  if (!result.success || !result.data) {
    // Si es super admin sin negocio, redirigir al panel de admin
    if (isAdmin) {
      redirect('/super-admin')
    }
    // Usuario normal sin negocio, redirigir a onboarding
    redirect('/onboarding')
  }

  const business = result.data

  // Obtener todos los negocios solo si es super admin
  let allBusinesses = null
  if (isAdmin) {
    const businessesResult = await getCachedAllBusinesses()
    if (businessesResult.success) {
      allBusinesses = businessesResult.data
    }
  }

  return (
    <BusinessProvider business={business}>
      <div className="min-h-dvh bg-background flex flex-col">
        <DashboardNavbar
          business={business}
          allBusinesses={allBusinesses}
          isSuperAdmin={isAdmin}
        />

        <main className="flex-1 w-full">
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </main>
      </div>
    </BusinessProvider>
  )
}
