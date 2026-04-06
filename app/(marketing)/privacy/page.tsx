import type { Metadata } from 'next'

export function generateMetadata(): Metadata {
  const title = 'Política de Privacidad'
  const description =
    'Conocé cómo Devora Buki recopila, usa y protege tus datos personales y de reservas.'

  return {
    title,
    description,
    alternates: {
      canonical: '/privacy',
    },
    openGraph: {
      title,
      description,
      url: '/privacy',
      type: 'article',
      images: [
        {
          url: '/og/home.png',
          width: 1200,
          height: 630,
          alt: 'Política de privacidad de Devora Buki',
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

export default function PrivacyPage() {
  const updatedAt = '12 de marzo de 2026'

  return (
    <section className="bg-linear-to-b from-background to-muted/30 py-28 sm:py-32">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur-sm sm:p-10">
          <p className="text-sm font-medium text-primary">Documentación legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Política de Privacidad
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-foreground/90 sm:text-base">
            <section>
              <h2 className="text-lg font-semibold">1. Responsable del tratamiento</h2>
              <p className="mt-2 text-muted-foreground">
                Buki (&ldquo;la Plataforma&rdquo;) es responsable del tratamiento de los datos personales recolectados a través de
                buki.devora.lat y los subdominios asociados.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Qué datos recopilamos</h2>
              <p className="mt-2 text-muted-foreground">
                Podemos recopilar datos de identificación y contacto, información de reservas, historial de uso,
                configuración de servicios, y datos técnicos necesarios para operar y proteger la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Finalidad del uso de datos</h2>
              <p className="mt-2 text-muted-foreground">
                Usamos tus datos para prestar el servicio de gestión de turnos, enviar notificaciones, procesar pagos,
                mejorar la experiencia de uso, prevenir fraude y cumplir obligaciones legales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Integraciones con terceros</h2>
              <p className="mt-2 text-muted-foreground">
                La Plataforma puede integrarse con servicios como Google Calendar y pasarelas de pago. Estos terceros
                procesan datos según sus propias políticas de privacidad y condiciones.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Conservación y seguridad</h2>
              <p className="mt-2 text-muted-foreground">
                Conservamos los datos durante el tiempo necesario para la prestación del servicio y aplicamos medidas
                técnicas y organizativas razonables para protegerlos contra accesos no autorizados o pérdida.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Derechos del titular</h2>
              <p className="mt-2 text-muted-foreground">
                Podés solicitar acceso, rectificación, actualización o eliminación de tus datos, así como revocar tu
                consentimiento para tratamientos específicos, cuando corresponda.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Cookies y tecnologías similares</h2>
              <p className="mt-2 text-muted-foreground">
                Utilizamos cookies y tecnologías equivalentes para autenticación, seguridad, métricas y funcionalidad
                esencial del producto.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Contacto</h2>
              <p className="mt-2 text-muted-foreground">
                Para consultas sobre privacidad o ejercicio de derechos, podés escribir a
                {' '}
                <a className="font-medium text-primary hover:underline" href="mailto:theo@netflux.com.ar">
                  theo@netflux.com.ar
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}