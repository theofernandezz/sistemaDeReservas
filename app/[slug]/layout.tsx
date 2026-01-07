import { notFound } from 'next/navigation'
import { getBusinessBySlug } from '@/app/actions/auth'
import { BusinessProvider } from '@/lib/business-context'
import Link from 'next/link'

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

  return (
    <BusinessProvider business={business}>
      <div className="min-h-[100dvh] flex flex-col bg-background">
        {/* Header with business branding */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              {business.logo ? (
                <img
                  src={business.logo}
                  alt={business.name}
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-sm">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-bold tracking-tight text-xl hidden sm:inline-block">
                {business.name}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-0 lg:px-0 lg:max-w-none">
          {children}
        </main>

        {/* Footer - hidden on desktop for booking pages */}
        <footer className="py-6 border-t mt-auto px-4 bg-secondary/30 lg:hidden">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {business.address && <span>{business.address}</span>}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {business.instagram && (
                <a
                  href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {business.instagram}
                </a>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {business.name}
            </p>
          </div>
        </footer>
      </div>
    </BusinessProvider>
  )
}
