# Buki

Sistema de turnos online para profesionales y pequeños negocios que hoy organizan su agenda por WhatsApp o en una planilla. Cada negocio tiene su página pública de reservas, su panel de gestión y cobra señas por MercadoPago o transferencia.

Está en producción y lo usa un negocio real.

**Demo:** https://buki.devora.lat/  
Usuario: maelcum69@gmail.com  
Contraseña: PyH*iS9pu-*q3Ha

## Qué resuelve

Llevar los turnos a mano genera reservas superpuestas, mucho ida y vuelta para coordinar horarios y clientes que no se presentan. Con Buki el cliente elige un horario libre, paga la seña si el negocio la pide y recibe la confirmación y un recordatorio por email. El profesional ve todo en un calendario.

## Funcionalidades

**Reservas**
- Página pública por negocio (`/[slug]`) donde el cliente elige servicio, extras y horario
- Horarios disponibles calculados a partir del horario de atención, la duración del servicio y los turnos ya tomados
- Bloqueos de agenda (vacaciones, almuerzo, etc.)
- Link privado para que el cliente vea o cancele su turno sin crear una cuenta

**Panel del negocio**
- Calendario con vista de día, semana y mes (FullCalendar)
- Servicios con duración, precio y extras opcionales
- Confirmación y cancelación de turnos e historial por cliente
- Sincronización de turnos con Google Calendar

**Pagos**
- Cada negocio conecta su propia cuenta de MercadoPago (OAuth) y cobra la seña o el total al reservar
- Webhook de MercadoPago para confirmar los pagos
- Alternativa por transferencia: el cliente sube el comprobante y el negocio lo aprueba

**Notificaciones y tareas programadas**
- Emails de confirmación y cancelación con Resend
- Cron diario que manda recordatorios de los turnos próximos
- Cron diario que limpia turnos cancelados y completados viejos

**Administración**
- Onboarding guiado para dar de alta un negocio nuevo
- Panel de super admin para crear y editar negocios

## Stack

- Next.js 16 (App Router, Server Actions), React 19 y TypeScript
- Supabase: PostgreSQL, Auth y Storage
- Tailwind CSS v4, Radix UI y Framer Motion
- Zod para validar datos
- MercadoPago, Resend y Google Calendar API
- Vitest para los tests y GitHub Actions para CI
- Deploy en Vercel, con Vercel Cron

## Decisiones técnicas

- **Multi-tenant en una sola instancia.** Cada negocio se identifica por su `slug` y todas las tablas están asociadas a un `business_id`, así los datos de un negocio quedan separados de los de otro.
- **Server Actions en lugar de una API REST.** La lógica de negocio corre en el servidor sin una capa de endpoints intermedia. Solo hay Route Handlers donde hace falta una URL externa: webhooks, callbacks de OAuth y crons.
- **Links de turno sin estado.** El link que recibe el cliente lleva un token firmado con HMAC-SHA256, así que no hace falta guardarlo en la base. Para invalidar un link se incrementa una versión en el turno; para invalidarlos todos, se rota el secreto.
- **Reglas de reserva separadas de la UI.** La disponibilidad y las reglas de reserva y pago están en funciones puras dentro de `lib/`, cubiertas por tests.

## Calidad

- Tests con Vitest de disponibilidad, reglas de turnos, links de gestión, validación de reservas, escape de HTML en emails y el webhook de MercadoPago
- CI en GitHub Actions que corre lint, type-check, build y tests en cada push y pull request a `main`
- Endpoint `/api/health` que verifica la conexión a la base y las variables de entorno

## Estructura

```
app/
  (marketing)/   landing
  (auth)/        login y registro
  [slug]/        página pública de reservas del negocio
  turno/[token]/ gestión del turno por parte del cliente
  dashboard/     panel del negocio
  onboarding/    alta de un negocio nuevo
  super-admin/   gestión de todos los negocios
  api/           webhooks, OAuth (MercadoPago, Google), crons, uploads
components/      componentes por área (booking, dashboard, ui, ...)
lib/             reglas de negocio, disponibilidad, emails, integraciones
supabase/        migraciones SQL
__tests__/       tests
```

## Cómo correrlo

Requisitos: Node.js 20 o superior, pnpm y un proyecto de Supabase.

```bash
git clone https://github.com/theofernandezz/sistemaDeReservas.git
cd sistemaDeReservas
pnpm install
```

Aplicá las migraciones de `supabase/migrations` en tu proyecto de Supabase y creá un archivo `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# MercadoPago (OAuth para conectar la cuenta de cada negocio)
MERCADOPAGO_CLIENT_ID=
MERCADOPAGO_CLIENT_SECRET=
MERCADOPAGO_REDIRECT_URI=
MP_WEBHOOK_SECRET=

# Emails
RESEND_API_KEY=
RESEND_FROM_MAIL=
ADMIN_MAIL=

# Google Calendar (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Protege los endpoints de cron
CRON_SECRET=

# Secreto de al menos 32 caracteres para firmar los links /turno/{token}.
# Rotarlo invalida todos los links. Se puede generar con: openssl rand -base64 48
MANAGE_LINK_SECRET=
```

Después:

```bash
pnpm dev    # servidor de desarrollo en http://localhost:3000
pnpm test   # tests
```

## Próximos pasos

- Notificaciones push
- Reportes y métricas para el negocio
- Varios usuarios por negocio

## Licencia

Proyecto privado.
