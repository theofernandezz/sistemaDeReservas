import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Precios',
  description: 'Planes simples y transparentes para profesionales. Comienza gratis durante Early Access con todas las funciones.',
  openGraph: {
    title: 'Precios - Buki',
    description: 'Planes simples y transparentes. Early Access gratis.',
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
