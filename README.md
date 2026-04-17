# 📅 Turnero SaaS para Profesionales

Aplicación web multi-tenant diseñada para profesionales y pequeños negocios que necesitan gestionar turnos de forma automatizada, reemplazando flujos manuales como Excel o WhatsApp.

👉 **Demo en vivo:** *(agregar link)*
👉 **Video demo (2–3 min):** *(agregar link)*

---

## 🚀 Problema que resuelve

Muchos profesionales gestionan turnos de forma manual, lo que genera:

* Doble reserva de horarios
* Pérdida de tiempo en coordinación
* Mala experiencia para el cliente
* Falta de control sobre disponibilidad

Este sistema permite:

* Reservas online en tiempo real
* Gestión automática de disponibilidad
* Pagos anticipados
* Centralización de clientes y servicios

---

## 📊 Uso real

* 1 negocio activo utilizando el sistema
* Implementado en entorno real (no solo demo)
* Validación práctica del flujo de reservas

> *(Opcional: agregar métricas si podés — cantidad de turnos, usuarios, etc.)*

---

## ✨ Funcionalidades principales

### 🏢 Multi-Tenant

* Aislamiento de datos por negocio
* Página pública por usuario (`/[slug]`)
* Panel independiente por cliente

### 📆 Gestión de Turnos

* Calendario con vistas (día / semana / mes)
* Generación automática de slots disponibles
* Bloqueo de horarios (vacaciones, almuerzos, etc.)
* Confirmación y cancelación de citas

### 💼 Servicios

* CRUD completo
* Configuración de duración y precio
* Add-ons opcionales
* Activación/desactivación dinámica

### 👥 Clientes

* Registro de clientes
* Historial de citas
* Notificaciones por email

### 💳 Pagos

* Integración con MercadoPago
* Pagos anticipados o completos
* Registro de transacciones

### 🔐 Autenticación

* Login / Signup con email
* Protección de rutas
* Gestión de sesión segura

---

## 🧠 Decisiones Técnicas

* **Arquitectura multi-tenant:** separación lógica por `slug` para soportar múltiples negocios en una sola instancia
* **Supabase (PostgreSQL):** elegido para acelerar desarrollo sin sacrificar relaciones complejas entre entidades
* **Server Actions (Next.js):** simplificación del backend evitando una capa REST innecesaria
* **TypeScript:** tipado fuerte para reducir errores en runtime
* **FullCalendar:** manejo eficiente de visualización de turnos

---

## 🛠️ Stack Tecnológico

* **Frontend / Backend:** Next.js (App Router)
* **Lenguaje:** TypeScript
* **Base de Datos:** PostgreSQL (Supabase)
* **Autenticación:** Supabase Auth
* **UI:** Tailwind CSS + shadcn/ui
* **Calendario:** FullCalendar
* **Pagos:** MercadoPago
* **Emails:** Resend

---

## 🧩 Arquitectura (Resumen)

* Aplicación fullstack con Next.js

* Server Actions para lógica de negocio

* Base de datos relacional con entidades principales:

  * negocios
  * servicios
  * clientes
  * turnos

* Separación de dominios:

  * panel administrativo
  * flujo público de reservas

---

## 📁 Estructura del Proyecto

```
app/
 ├── (marketing)/      # Landing, auth
 ├── [slug]/           # Página pública de reservas
 ├── dashboard/        # Panel del usuario
 ├── admin/            # Gestión interna
 ├── api/              # Webhooks / integraciones
 └── actions.ts        # Server Actions

components/
 ├── booking/
 ├── dashboard/
 ├── admin/
 └── ui/

lib/                   # Configuración y helpers
supabase/              # Migraciones
types/                 # Tipos TypeScript
```

---

## ⚙️ Instalación

### Prerrequisitos

* Node.js 18+
* pnpm o npm
* Cuenta en Supabase

### Setup

```bash
git clone https://github.com/tu-usuario/sistemadereservas.git
cd sistemadereservas
pnpm install
```

### Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

MP_ACCESS_TOKEN=
RESEND_API_KEY=
```

### Ejecutar

```bash
pnpm dev
```

---

## 🔄 Flujo de Usuario

1. Registro del profesional
2. Configuración del negocio (slug, horarios)
3. Creación de servicios
4. Publicación de página de reservas
5. Cliente agenda turno
6. Gestión desde dashboard

---

## 📌 Posibles mejoras (roadmap)

* Notificaciones push
* Integración con Google Calendar
* Reportes y métricas de negocio
* Multi-usuario por negocio

---

## 🤝 Conclusión

Este proyecto no es solo un ejercicio técnico, sino una solución funcional validada en un caso real, enfocada en resolver un problema común de gestión de turnos en pequeños negocios.

---

## 📄 Licencia

Proyecto privado.
