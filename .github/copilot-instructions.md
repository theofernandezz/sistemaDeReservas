# Sistema de Reservas - Copilot Instructions

## 📋 Resumen del Proyecto

**Sistema de Reservas** es una plataforma SaaS multi-tenant para gestión de citas y reservas, diseñada para profesionales independientes (salones de belleza, consultorios, etc.). Permite a los negocios crear su página de reservas personalizada y a los clientes agendar citas online.

### Stack Tecnológico

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript 5
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Pagos:** MercadoPago (OAuth + Checkout Pro)
- **Emails:** Resend
- **Calendario:** Google Calendar API (sincronización)
- **UI:** Tailwind CSS 4 + Radix UI + shadcn/ui
- **Calendario UI:** FullCalendar + react-day-picker
- **Package Manager:** pnpm

---

## 🏗️ Arquitectura del Proyecto

### Estructura de Carpetas

```
├── app/                    # Next.js App Router
│   ├── (marketing)/       # Landing, login, signup, pricing (público)
│   ├── [slug]/            # Páginas públicas de cada negocio (booking)
│   ├── dashboard/         # Panel del dueño del negocio
│   ├── super-admin/       # Panel de administración global
│   ├── api/               # API Routes
│   ├── actions/           # Server Actions específicos
│   └── actions.ts         # Server Actions principales
├── components/
│   ├── admin/             # Componentes del dashboard admin
│   ├── booking/           # Componentes del flujo de reserva
│   ├── dashboard/         # Componentes del dashboard
│   ├── marketing/         # Componentes de la landing
│   └── ui/                # Componentes base (shadcn style)
├── lib/                   # Utilidades y servicios
│   ├── mercadopago.ts     # Integración MercadoPago
│   ├── google-calendar.ts # Integración Google Calendar
│   ├── email.ts           # Servicio de emails
│   ├── adapters.ts        # Adaptadores DB ↔ Frontend
│   └── business-context.tsx # Context del negocio
├── types/
│   ├── database.types.ts  # Tipos de Supabase/DB
│   └── frontend.types.ts  # Tipos para componentes
├── utils/supabase/        # Clientes de Supabase
│   ├── client.ts          # Cliente del navegador
│   └── server.ts          # Cliente del servidor
└── supabase/
    ├── schema.sql         # Schema de referencia
    └── migrations/        # Migraciones SQL
```

### Modelo Multi-Tenant

El sistema usa **tenant por negocio** con `business_id` como discriminador:

```typescript
// Todas las entidades principales tienen business_id
interface Service {
  id: string;
  business_id: string; // 👈 Discriminador del tenant
  name: string;
  // ...
}
```

**Roles de usuario:**

- `super_admin`: Acceso global (gestión de todos los negocios)
- `business_owner`: Dueño de uno o más negocios
- `client`: Usuario final que reserva (sin cuenta requerida por el momento)

---

## 🗄️ Modelos de Base de Datos

### Entidades Principales

| Tabla              | Descripción                       |
| ------------------ | --------------------------------- |
| `businesses`       | Negocios/tenants registrados      |
| `services`         | Servicios que ofrece cada negocio |
| `service_addons`   | Extras opcionales para servicios  |
| `appointments`     | Citas reservadas                  |
| `blocked_slots`    | Horarios bloqueados               |
| `pending_bookings` | Reservas pendientes de pago       |
| `mp_integrations`  | Credenciales OAuth de MercadoPago |

### Tipos Clave (types/database.types.ts)

```typescript
// Negocio
interface Business {
  id: string;
  owner_id: string; // UUID del usuario Supabase
  name: string;
  slug: string; // URL amigable: /slug
  settings: BusinessSettings;
  deposit_percentage: number;
}

// Servicio
interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

// Cita
interface Appointment {
  id: string;
  business_id: string;
  service_id: string;
  start_time: string; // ISO timestamp
  end_time: string;
  client_name: string;
  client_email: string | null;
  status: "pending" | "confirmed" | "cancelled";
  addons: SelectedAddon[];
}
```

---

## 🔐 Autenticación y Autorización

### Flujo de Auth

1. **Supabase Auth** maneja login/signup con email
2. **Middleware** protege rutas `/dashboard/*` y `/super-admin/*`
3. **RLS** (Row Level Security) filtra datos por `business_id`

### Middleware (middleware.ts)

```typescript
// Rutas protegidas:
// - /dashboard/* → Requiere usuario autenticado
// - /super-admin/* → Requiere user_metadata.is_super_admin = true
// - /admin/* → Redirige a /dashboard (legacy)
```

### Obtener usuario y negocio actual

```typescript
// En Server Components o Server Actions:
import { createClient } from "@/utils/supabase/server";

const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

// Obtener negocio del usuario
const { data: business } = await supabase
  .from("businesses")
  .select("*")
  .eq("owner_id", user.id)
  .single();
```

---

## 🔌 Integraciones

### MercadoPago

- **OAuth Flow:** El vendedor conecta su cuenta MP
- **Checkout Pro:** Pagos con preferencias
- **Webhooks:** Notificaciones en `/api/mercadopago/webhook`

```typescript
// lib/mercadopago.ts
createPaymentPreference(accessToken, items, metadata, backUrls);
refreshMPToken(refreshToken);
```

### Google Calendar

- **Sincronización:** Crear eventos al confirmar citas
- **OAuth:** Guardado en `business.settings.googleRefreshToken`

### Resend (Emails)

- Confirmación de reservas
- Recordatorios

---

## 📝 Convenciones de Código

### Server Actions

Ubicación: `app/actions.ts` y `app/actions/*.ts`

```typescript
"use server";

// Patrón de respuesta
interface ServerActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Ejemplo
export async function createService(
  businessId: string,
  input: CreateServiceInput
): Promise<ServerActionResponse<Service>> {
  try {
    const supabase = await createClient();
    // ... lógica
    return { success: true, data: service };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### Componentes UI

- Usar componentes de `@/components/ui/*` (estilo shadcn)
- Icons: `lucide-react`
- Estilos: Tailwind CSS con `cn()` para merge de clases

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
```

### Adaptadores (lib/adapters.ts)

Convertir tipos de DB a Frontend y viceversa:

```typescript
export function serviceToFrontend(service: Service): FrontendService;
export function frontendToService(
  frontendService: FrontendService
): CreateServiceInput;
```

---

## 🛣️ Rutas Principales

| Ruta                          | Descripción                |
| ----------------------------- | -------------------------- |
| `/`                           | Landing page               |
| `/login`                      | Inicio de sesión           |
| `/signup`                     | Registro de nuevo negocio  |
| `/pricing`                    | Planes y precios           |
| `/[slug]`                     | Página pública del negocio |
| `/[slug]/booking/[serviceId]` | Flujo de reserva           |
| `/dashboard`                  | Panel del dueño            |
| `/dashboard/services`         | Gestión de servicios       |
| `/dashboard/appointments`     | Lista de citas             |
| `/dashboard/calendar`         | Vista calendario           |
| `/dashboard/availability`     | Horarios y bloqueos        |
| `/dashboard/settings`         | Configuración del negocio  |
| `/super-admin`                | Panel de super admin       |

---

## 🧪 Desarrollo

### Variables de Entorno Requeridas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# MercadoPago OAuth
MERCADOPAGO_CLIENT_ID=xxx
MERCADOPAGO_CLIENT_SECRET=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (opcional)
RESEND_API_KEY=re_xxx

# Google Calendar (opcional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

### Comandos

```bash
pnpm dev      # Desarrollo
pnpm build    # Build de producción
pnpm lint     # ESLint
```

### Testing Manual

- `/test-supabase` → Verificar conexión a Supabase

---

## ⚠️ Consideraciones Importantes

### Al crear nuevas features:

1. **Siempre filtrar por `business_id`** en queries
2. **Usar Server Actions** para mutaciones de datos
3. **Validar permisos** antes de operaciones sensibles
4. **Manejar errores** con try/catch y respuestas tipadas

### Al modificar la DB:

1. Crear migración en `supabase/migrations/`
2. Actualizar tipos en `types/database.types.ts`
3. Considerar RLS policies

### Patrones a seguir:

- ✅ Server Components por defecto
- ✅ 'use client' solo cuando sea necesario
- ✅ Server Actions para forms y mutaciones
- ✅ Zod para validación (si se agrega)
- ❌ No usar `getServerSideProps` (App Router)
- ❌ No exponer secrets en el cliente

---

## 📚 Referencias Útiles

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [MercadoPago SDK](https://www.mercadopago.com.ar/developers)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Aceternity UI](https://ui.aceternity.com/components)
