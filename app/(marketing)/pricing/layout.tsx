import type { Metadata } from 'next'

export function generateMetadata(): Metadata {
  const title = 'Precios'
  const description =
    'Planes simples y transparentes para profesionales. Comienza gratis durante Early Access con todas las funciones.'

  return {
    title,
    description,
    alternates: {
      canonical: '/pricing',
    },
    openGraph: {
      title,
      description,
      url: '/pricing',
      type: 'website',
      images: [
        {
          url: '/og/home.png',
          width: 1200,
          height: 630,
          alt: 'Planes y precios de Devora Buki',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og/home.png'],
    },
  }
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
