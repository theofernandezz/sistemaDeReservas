# 📅 Sistema de Reservas

Sistema de gestión de citas y reservas **multi-tenant SaaS**, diseñado para profesionales y negocios que necesitan automatizar su agenda de manera inteligente.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

## ✨ Características Principales

### 🏢 Multi-Tenant
- **Aislamiento de datos** por negocio/empresa
- Cada negocio tiene su propia página pública de reservas (`/[slug]`)
- Dashboard personalizado para cada usuario

### 📆 Gestión de Citas
- Calendario interactivo con vistas: día, semana, mes
- Slots de disponibilidad automáticos
- Bloqueo de horarios (almuerzo, vacaciones, etc.)
- Confirmación y cancelación de citas

### 💼 Servicios y Add-ons
- CRUD completo de servicios
- Precios y duración personalizables
- Add-ons opcionales por servicio
- Activación/desactivación de servicios

### 👥 Gestión de Clientes
- Registro de clientes con información de contacto
- Historial de citas por cliente
- Notificaciones por email (Resend)

### 💳 Pagos Integrados
- Integración con **MercadoPago**
- Pagos anticipados o al momento (seña previa o pago completo)
- Historial de transacciones

### 🔐 Autenticación
- Login/Signup con email
- Autenticación segura con **Supabase Auth**
- Middleware de protección de rutas

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Base de Datos** | Supabase (PostgreSQL) |
| **Autenticación** | Supabase Auth |
| **Estilos** | Tailwind CSS 4 |
| **UI Components** | Radix UI + shadcn/ui |
| **Calendario** | FullCalendar |
| **Animaciones** | Framer Motion |
| **Emails** | Resend |
| **Pagos** | MercadoPago |
| **Lenguaje** | TypeScript |

## 📁 Estructura del Proyecto

```
sistemadereservas/
├── app/
│   ├── (marketing)/      # Landing page, login, signup, pricing
│   ├── [slug]/           # Páginas públicas de reservas por negocio
│   ├── admin/            # Panel de administración
│   ├── api/              # API routes (webhooks, etc.)
│   ├── booking/          # Flujo de reservas
│   ├── dashboard/        # Dashboard del usuario
│   ├── onboarding/       # Configuración inicial del negocio
│   └── actions.ts        # Server Actions centralizados
├── components/
│   ├── admin/            # Componentes del panel admin
│   ├── availability/     # Gestión de disponibilidad
│   ├── booking/          # Componentes de reserva
│   ├── dashboard/        # Componentes del dashboard
│   ├── marketing/        # Landing page components
│   └── ui/               # Componentes base (shadcn/ui)
├── lib/                  # Utilidades y configuración
├── supabase/
│   └── migrations/       # Migraciones de base de datos
├── types/                # TypeScript types
└── docs/                 # Documentación adicional
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- pnpm (recomendado) o npm
- Cuenta de Supabase

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/sistemadereservas.git
cd sistemadereservas
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# MercadoPago (opcional)
MP_ACCESS_TOKEN=tu-access-token

# Resend (opcional)
RESEND_API_KEY=tu-api-key
```

> 📘 Ver [docs/ENV_SETUP.md](./docs/ENV_SETUP.md) para guía detallada de credenciales.

### 4. Ejecutar en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📖 Documentación

- [Guía de Integración Supabase](./docs/INTEGRATION_GUIDE.md) - Cómo usar las Server Actions
- [Configuración de Variables](./docs/ENV_SETUP.md) - Setup de credenciales

## 🔧 Scripts Disponibles

```bash
pnpm dev      # Servidor de desarrollo
pnpm build    # Build de producción
pnpm start    # Servidor de producción
pnpm lint     # Ejecutar ESLint
```

## 📚 Server Actions

El proyecto utiliza **Server Actions** para todas las operaciones de base de datos. Ejemplos de uso:

```typescript
import { getServices, createAppointment, getAvailableSlots } from '@/app/actions'

// Obtener servicios
const services = await getServices()

// Ver disponibilidad
const slots = await getAvailableSlots(serviceId, '2024-12-20')

// Crear una cita
const appointment = await createAppointment({
  start_time: '2024-12-20T10:00:00Z',
  client_name: 'Juan Pérez',
  service_id: serviceId
})
```

## 🌐 Flujo de Usuario

1. **Registro** → El profesional crea una cuenta
2. **Onboarding** → Configura su negocio (nombre, slug, horarios)
3. **Servicios** → Agrega sus servicios y precios
4. **Compartir** → Su página pública: `dominio.com/[slug]`
5. **Clientes** → Los clientes reservan desde la página pública
6. **Dashboard** → El profesional gestiona sus citas

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios propuestos.

## 📄 Licencia

Este proyecto es privado y de uso exclusivo.

---

Desarrollado con ❤️ para facilitar la gestión de reservas.
