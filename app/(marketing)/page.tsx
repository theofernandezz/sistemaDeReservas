import Link from 'next/link'
import { SoftwareApplicationSchema } from '@/components/seo/structured-data'
import HomePage from './home-page'

export default function Page() {
  return (
    <>
      <SoftwareApplicationSchema />
      <HomePage />
      <section className="pb-10">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-center text-sm text-muted-foreground">
            Devora Buki ·
            {' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Política de Privacidad
            </Link>
            {' '}
            ·
            {' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Términos y Condiciones
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
