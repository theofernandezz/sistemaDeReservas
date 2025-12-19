# Guía de Integración Supabase + Next.js

## 📚 Tabla de Contenidos

1. [Setup Inicial](#setup-inicial)
2. [Server Actions - Uso](#server-actions---uso)
3. [Ejemplos de Componentes](#ejemplos-de-componentes)
4. [Generación Automática de Tipos](#generación-automática-de-tipos)

---

## Setup Inicial

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**¿Dónde encontrar estas credenciales?**
- Dashboard de Supabase → Tu Proyecto → Settings → API
- Copia "Project URL" y "anon/public key"

### 2. Instalar Dependencias

```bash
pnpm install
```

---

## Server Actions - Uso

Todas las Server Actions están en `app/actions.ts`. Aquí aprenderás a usarlas:

### Servicios

```typescript
import { getServices, createService, updateService } from '@/app/actions'

// Obtener todos los servicios activos
const result = await getServices()
if (result.success) {
  console.log(result.data) // Service[]
}

// Crear un nuevo servicio
const newService = await createService({
  name: 'Manicura Express',
  duration_minutes: 45,
  price: 30,
  is_active: true
})

// Actualizar un servicio
const updated = await updateService('service-id-123', {
  price: 35
})
```

### Citas / Appointments

```typescript
import { 
  getAppointments,
  createAppointment,
  getAvailableSlots
} from '@/app/actions'

// Obtener todas las citas de hoy
const today = new Date().toISOString().split('T')[0]
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const appointments = await getAppointments({
  startDate: today,
  endDate: tomorrow.toISOString().split('T')[0]
})

// Crear una nueva reserva
const booking = await createAppointment({
  start_time: '2024-12-20T10:00:00Z',
  end_time: '2024-12-20T11:00:00Z',
  client_name: 'Ana García',
  client_phone: '+54911234567',
  client_email: 'ana@example.com',
  status: 'pending',
  service_id: 'service-uuid-here'
})

// Ver slots disponibles para un servicio en una fecha
const slots = await getAvailableSlots(
  'service-uuid-here',
  '2024-12-21'
)
// Retorna: [{ time: '09:00', available: true }, { time: '09:30', available: false, reason: 'booked' }, ...]
```

### Slots Bloqueados

```typescript
import { 
  getBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot
} from '@/app/actions'

// Bloquear un horario (ej: almuerzo)
const blocked = await createBlockedSlot({
  start_time: '2024-12-20T13:00:00Z',
  end_time: '2024-12-20T14:00:00Z',
  reason: 'Lunch break'
})

// Obtener todos los bloqueos del mes
const slots = await getBlockedSlots(
  '2024-12-01',
  '2024-12-31'
)
```

---

## Ejemplos de Componentes

### Server Component: Lista de Servicios

```tsx
// app/admin/services/page.tsx
import { getServices } from '@/app/actions'

export default async function ServicesPage() {
  const result = await getServices()
  
  if (!result.success) {
    return <div>Error: {result.error}</div>
  }
  
  const services = result.data
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mis Servicios</h1>
      
      <div className="grid gap-4">
        {services?.map(service => (
          <div key={service.id} className="border p-4 rounded-lg">
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-sm text-gray-600">
              ${service.price} • {service.duration_minutes} min
            </p>
            <span className={`text-xs px-2 py-1 rounded ${
              service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100'
            }`}>
              {service.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Client Component: Formulario de Servicio

```tsx
'use client'

import { useState } from 'react'
import { createService } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function ServiceForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: 60,
    price: 0
  })
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await createService(formData)
    
    if (result.success) {
      alert('¡Servicio creado!')
      router.refresh() // Recargar datos del servidor
    } else {
      alert('Error: ' + result.error)
    }
    
    setLoading(false)
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 border rounded">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Precio ($)</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Duración (min)</label>
          <input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Crear Servicio'}
      </button>
    </form>
  )
}
```

### Server Component: Calendario de Disponibilidad

```tsx
// app/booking/[serviceId]/page.tsx
import { getAvailableSlots, getServiceById } from '@/app/actions'

export default async function BookingPage({
  params
}: {
  params: Promise<{ serviceId: string }>
}) {
  const { serviceId } = await params
  const today = new Date().toISOString().split('T')[0]
  
  const [serviceResult, slotsResult] = await Promise.all([
    getServiceById(serviceId),
    getAvailableSlots(serviceId, today)
  ])
  
  if (!serviceResult.success || !slotsResult.success) {
    return <div>Error cargando disponibilidad</div>
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{serviceResult.data.name}</h1>
      <p className="text-gray-600 mb-6">
        ${serviceResult.data.price} • {serviceResult.data.duration_minutes} minutos
      </p>
      
      <h2 className="text-lg font-semibold mb-3">Horarios disponibles hoy</h2>
      
      <div className="grid grid-cols-3 gap-2">
        {slotsResult.data.map(slot => (
          <button
            key={slot.time}
            disabled={!slot.available}
            className={`p-3 rounded border ${
              slot.available
                ? 'hover:bg-blue-50 border-blue-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Generación Automática de Tipos

Si prefieres que los tipos de TypeScript se generen directamente desde tu base de datos de Supabase, sigue estos pasos:

### 1. Instala la CLI de Supabase

```bash
pnpm add -D supabase
```

### 2. Login en Supabase

```bash
npx supabase login
```

### 3. Genera los tipos

```bash
npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.types.generated.ts
```

Reemplaza `TU_PROJECT_ID` con el ID de tu proyecto (se encuentra en la URL del dashboard).

### 4. Usa los tipos generados

Los tipos auto-generados son extremadamente precisos ya que vienen directo del schema de Supabase. Puedes importarlos así:

```typescript
import { Database } from '@/types/database.types.generated'

type Service = Database['public']['Tables']['services']['Row']
type ServiceInsert = Database['public']['Tables']['services']['Insert']
type ServiceUpdate = Database['public']['Tables']['services']['Update']
```

---

## 🚀 Próximos Pasos

1. **Configurar .env.local** con tus credenciales reales
2. **Probar la conexión** corriendo `pnpm run dev`
3. **Crear tu primer componente** usando las Server Actions
4. **Migrar los componentes** del frontend de `luxenail-booking` al proyecto Next.js

## 📝 Notas Importantes

- **Todas las Server Actions retornan** un objeto `{ success: boolean, data?, error? }`
- **Siempre verifica `result.success`** antes de usar `result.data`
- **Los Server Components** pueden llamar directamente a Server Actions con `await`
- **Los Client Components** deben usar hooks o manejadores de eventos
- **La función `getAvailableSlots`** ya calcula qué horarios están libres considerando appointments y blocked_slots

¿Necesitas ayuda con algo específico? ¡Estoy aquí para ayudarte! 🎯
