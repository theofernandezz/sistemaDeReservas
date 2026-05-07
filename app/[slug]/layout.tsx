import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/app/actions/auth'
import { BusinessProvider } from '@/lib/business-context'
import { ConditionalFooter } from '@/components/conditional-footer'
import { LocalBusinessSchema } from '@/components/seo/structured-data'
import { cn } from '@/lib/utils'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const result = await getBusinessBySlug(slug)

  if (!result.success || !result.data) return {}

  return { title: result.data.name }
}

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
        {/* Premium minimal header */}
        <header 
          className={cn(
            "sticky top-0 z-50 w-full",
            "bg-background/70 backdrop-blur-2xl",
            "border-b border-border/30",
            "supports-[backdrop-filter]:bg-background/60 transition-colors duration-300"
          )}
        >
          <div className="max-w-5xl mx-auto flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Business branding */}
            <a 
              href={`/${slug}`}
              className={cn(
                "group flex items-center gap-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg p-1 -m-1"
              )}
            >
              {business.logo ? (
                <div className="relative overflow-hidden rounded-xl bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={business.logo}
                    alt=""
                    className="h-10 w-10 sm:h-12 sm:w-12 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-foreground/10 rounded-xl pointer-events-none" aria-hidden="true" />
                </div>
              ) : (
                <div 
                  className={cn(
                    "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl",
                    "font-medium text-lg text-background bg-foreground shadow-sm",
                    "transition-transform duration-500 group-hover:scale-105"
                  )}
                  aria-hidden="true"
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-lg sm:text-xl text-foreground truncate max-w-[200px] sm:max-w-[300px] group-hover:text-foreground/80 transition-colors">
                  {business.name}
                </span>
              </div>
            </a>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Powered by badge - subtle editorial */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 border border-border/50 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} aria-hidden="true" />
                Reservas Online
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          id="main-content"
          className="flex-1 w-full"
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
