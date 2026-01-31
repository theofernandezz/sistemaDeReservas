import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/app/actions/auth'
import { BusinessProvider } from '@/lib/business-context'
import { ConditionalFooter } from '@/components/conditional-footer'
import { LocalBusinessSchema } from '@/components/seo/structured-data'
import { cn } from '@/lib/utils'

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
      <>
        <LocalBusinessSchema business={business} />
        <div className="min-h-dvh flex flex-col bg-background">
        {/* Premium header with glass effect and accent */}
        <header 
          className={cn(
            "sticky top-0 z-50 w-full",
            "bg-background/80 backdrop-blur-xl",
            "border-b border-border/40",
            "supports-[backdrop-filter]:bg-background/60"
          )}
        >
          {/* Subtle accent line at top */}
          <div 
            className="absolute top-0 left-0 right-0 h-px opacity-30"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
            }}
            aria-hidden="true"
          />
          
          <div className="max-w-3xl mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:max-w-[1400px] lg:px-12">
            {/* Business branding */}
            <a 
              href={`/${slug}`}
              className={cn(
                "flex items-center gap-2.5 sm:gap-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg p-1 -m-1"
              )}
            >
              {business.logo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={business.logo}
                    alt=""
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover ring-1 ring-border/50"
                  />
                  {/* Subtle glow behind logo */}
                  <div 
                    className="absolute inset-0 -z-10 blur-lg opacity-30 rounded-xl"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <div 
                  className={cn(
                    "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl",
                    "font-bold text-sm sm:text-base text-white",
                    "shadow-md transition-transform duration-200 hover:scale-105"
                  )}
                  style={{ backgroundColor: accentColor }}
                  aria-hidden="true"
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold tracking-tight text-base sm:text-lg text-foreground truncate max-w-[200px] sm:max-w-none">
                {business.name}
              </span>
            </a>

            {/* Right side - could add menu or actions here */}
            <div className="flex items-center gap-2">
              {/* Powered by badge - subtle */}
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <span className="inline-block w-1 h-1 rounded-full bg-current" aria-hidden="true" />
                Reservas online
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          id="main-content"
          className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:max-w-none lg:px-0 lg:py-0"
          tabIndex={-1}
        >
          {children}
        </main>

        {/* Footer condicional - oculto en flujo de booking */}
        <ConditionalFooter business={business} />
        </div>
      </>
    </BusinessProvider>
  )
}
