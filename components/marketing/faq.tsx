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
    <section id="faq" className="container px-4 py-24 md:py-32">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Preguntas frecuentes
          </h2>
          <p className="text-muted-foreground text-lg">
            ¿Tenés dudas? Acá respondemos las más comunes.
          </p>
        </div>

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

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
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
    </section>
  )
}
