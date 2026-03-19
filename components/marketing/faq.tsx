'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: '¿Cómo funciona el período gratuito?',
    answer:
      'Durante el early access, podés usar todas las funcionalidades sin costo. Esto nos permite recibir tu feedback y mejorar la plataforma. Cuando lancemos los planes pagos, te avisaremos con anticipación.',
  },
  {
    question: '¿Cómo conecto Mercado Pago para cobrar?',
    answer:
      'En tu dashboard, vas a "Configuración" → "Pagos" y seguís los pasos para vincular tu cuenta de Mercado Pago. El proceso toma menos de 2 minutos y podés empezar a cobrar señas o pagos completos inmediatamente.',
  },
  {
    question: '¿Mis clientes necesitan crear una cuenta?',
    answer:
      'No. Tus clientes pueden reservar sin registrarse. Solo necesitan ingresar su nombre, email y teléfono para confirmar la cita. Vos ves todo su historial desde tu panel.',
  },
  {
    question: '¿Puedo personalizar mis horarios de atención?',
    answer:
      'Sí, podés configurar tus días y horarios de atención, bloquear horarios específicos (almuerzo, vacaciones), definir la duración de cada servicio, y mucho más.',
  },
  {
    question: '¿Cómo reciben los recordatorios mis clientes?',
    answer:
      'Actualmente enviamos recordatorios automáticos por email antes de cada cita. Estamos trabajando en integrar recordatorios por WhatsApp próximamente.',
  },
  {
    question: '¿Puedo tener múltiples servicios con diferentes precios?',
    answer:
      'Sí, podés crear todos los servicios que necesites, cada uno con su propio nombre, descripción, duración y precio. También podés agregar add-ons opcionales.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="bg-secondary/30 py-28 md:py-36">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial header */}
        <div className="mb-12 space-y-3 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
            Preguntas frecuentes
          </p>
          <h2 className="font-extrabold tracking-[-0.03em] leading-tight text-foreground" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)' }}>
            Todo lo que querés saber
          </h2>
        </div>

        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12">
            <p className="text-muted-foreground text-sm">
              ¿No encontrás lo que buscás?{' '}
              <a
                href="mailto:soporte@tudominio.com"
                className="text-primary hover:underline font-medium"
              >
                Escribinos
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
