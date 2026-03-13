import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description:
    'Leé los términos que regulan el uso de Buki, incluyendo responsabilidades, pagos y uso aceptable.',
}

export default function TermsPage() {
  const updatedAt = '12 de marzo de 2026'

  return (
    <section className="bg-linear-to-b from-background to-muted/30 py-28 sm:py-32">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur-sm sm:p-10">
          <p className="text-sm font-medium text-primary">Documentación legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Términos y Condiciones del Servicio
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-foreground/90 sm:text-base">
            <section>
              <h2 className="text-lg font-semibold">1. Aceptación de los términos</h2>
              <p className="mt-2 text-muted-foreground">
                Al registrarte o usar Buki, aceptás estos términos y condiciones. Si no estás de acuerdo, no debés
                utilizar la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Descripción del servicio</h2>
              <p className="mt-2 text-muted-foreground">
                Buki ofrece herramientas de agenda y reservas online para profesionales y equipos, incluyendo
                recordatorios, administración de turnos e integraciones con terceros.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Registro y seguridad de cuenta</h2>
              <p className="mt-2 text-muted-foreground">
                El usuario es responsable de mantener la confidencialidad de sus credenciales y de toda actividad que
                ocurra en su cuenta.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Uso permitido</h2>
              <p className="mt-2 text-muted-foreground">
                Está prohibido utilizar la Plataforma para actividades ilícitas, fraudulentas, abusivas o que vulneren
                derechos de terceros.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Planes, cobros y terceros</h2>
              <p className="mt-2 text-muted-foreground">
                Los planes pagos, promociones y condiciones comerciales pueden actualizarse. Los cobros procesados por
                terceros (por ejemplo, pasarelas de pago) se rigen además por sus propios términos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Disponibilidad y cambios</h2>
              <p className="mt-2 text-muted-foreground">
                Procuramos mantener el servicio disponible de forma continua, pero no garantizamos ausencia total de
                interrupciones. Podemos modificar funcionalidades para mejorar el producto o por razones legales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Propiedad intelectual</h2>
              <p className="mt-2 text-muted-foreground">
                El software, diseño, marca y contenidos de Buki están protegidos por normativa de propiedad intelectual.
                No se permite su reproducción o explotación sin autorización.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Limitación de responsabilidad</h2>
              <p className="mt-2 text-muted-foreground">
                En la máxima medida permitida por la ley, Buki no será responsable por daños indirectos, lucro cesante o
                pérdidas derivadas del uso o imposibilidad de uso de la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Terminación</h2>
              <p className="mt-2 text-muted-foreground">
                Podemos suspender o terminar cuentas en caso de incumplimiento de estos términos o por requerimientos
                legales aplicables.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Contacto</h2>
              <p className="mt-2 text-muted-foreground">
                Para consultas legales, podés comunicarte con
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