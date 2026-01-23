import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/app/actions/auth'
import { BusinessProvider } from '@/lib/business-context'
import { ConditionalFooter } from '@/components/conditional-footer'

export default async function PublicBookingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getBusinessBySlug(slug)

  if (!result.success || !result.data) {
    notFound()
  }

  const business = result.data
  
  // Color de acento del negocio (default naranja)
  const accentColor = business.settings?.accentColor || '#f97316'

  return (
    <BusinessProvider business={business}>
      <div className="min-h-dvh flex flex-col bg-background">
        {/* Header with business branding */}
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl supports-backdrop-filter:bg-background/80">
          <div className="max-w-3xl mx-auto flex h-12 sm:h-14 items-center justify-between px-3 sm:px-6 lg:max-w-[1400px] lg:px-12">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {business.logo ? (
                <img
                  src={business.logo}
                  alt={business.name}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-cover"
                />
              ) : (
                <div 
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg font-bold text-sm sm:text-base shadow-sm text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold tracking-tight text-base sm:text-lg text-foreground truncate max-w-50 sm:max-w-none">
                {business.name}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 md:py-8 lg:max-w-none lg:px-0 lg:py-0">
          {children}
        </main>

        {/* Footer condicional - oculto en flujo de booking */}
        <ConditionalFooter business={business} />
      </div>
    </BusinessProvider>
  )
}
