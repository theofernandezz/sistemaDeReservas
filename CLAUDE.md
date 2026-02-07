# AI Development Library - Claude Code

> Este archivo configura cómo Claude Code debe usar la librería de skills para desarrollo.

---

## Sistema de Skills

Esta librería contiene **skills** (patrones de código) y **agentes especializados** (contexto por dominio) que DEBES usar ANTES de escribir código.

### Regla Crítica

**SIEMPRE cargá y leé los skills relevantes ANTES de escribir código.**

No importa cuán "simple" parezca la tarea. Sin excepciones. Si no seguís los patrones de los skills, el código será rechazado.

---

## Detección Automática de Skills

Cuando trabajes con estas acciones/archivos, **lee el skill correspondiente PRIMERO**:

| Si estás... | Skill | Path |
|-------------|-------|------|
| Creando/editando archivos .ts o .tsx | `typescript` | `skills/generic/typescript/SKILL.md` |
| Trabajando en app/ directory | `nextjs-core` | `skills/generic/nextjs-core/SKILL.md` |
| Creando componentes React | `react-patterns` | `skills/generic/react-patterns/SKILL.md` |
| Usando Tailwind/shadcn/Aceternity | `ui-engineering` | `skills/generic/ui-engineering/SKILL.md` |
| Trabajando con Supabase/DB | `database` | `skills/generic/database/SKILL.md` |
| Creando Server Actions | `nextjs-core` + `security` | Ver ambos skills |
| Manejando autenticación | `security` | `skills/generic/security/SKILL.md` |
| Escribiendo tests | `testing` | `skills/generic/testing/SKILL.md` |
| Haciendo commits/PRs | `git-workflow` | `skills/generic/git-workflow/SKILL.md` |
| Creando API routes/webhooks | `api-design` | `skills/generic/api-design/SKILL.md` |
| Manejando errores | `error-handling` | `skills/generic/error-handling/SKILL.md` |
| Internacionalizando | `i18n` | `skills/generic/i18n/SKILL.md` |
| Trabajando accesibilidad | `accessibility` | `skills/generic/accessibility/SKILL.md` |
| Optimizando performance | `performance` | `skills/generic/performance/SKILL.md` |
| Configurando SEO | `seo` | `skills/generic/seo/SKILL.md` |
| Creando videos con Remotion | `remotion` | `skills/generic/remotion/SKILL.md` |

---

## Delegación por Dominio

Cuando la tarea pertenece a un dominio específico, **cargá el agente correspondiente** para obtener contexto completo:

| Dominio | Agente | Cuándo usarlo |
|---------|--------|---------------|
| **UI/Frontend** | `agents/ui.md` | Componentes, estilos, animaciones, accesibilidad |
| **Backend/Server** | `agents/backend.md` | Server Actions, APIs, base de datos, lógica de negocio |
| **Auth** | `agents/auth.md` | Autenticación, autorización, RLS, sesiones |
| **Testing** | `agents/testing.md` | Tests unitarios, integración, E2E |

### Cómo "Delegar"

La delegación en Claude Code se hace cargando contexto adicional:

```
1. Leé el archivo del agente (ej: agents/ui.md)
2. Identificá los skills que orquesta
3. Leé cada skill listado
4. Ejecutá la tarea siguiendo TODOS los patrones
```

---

## Meta-Skills

Para tareas especiales de la librería:

| Tarea | Skill | Instrucción |
|-------|-------|-------------|
| Crear nuevo skill | `skill-creator` | Lee `skills/skill-creator/SKILL.md` y seguí el template |
| Sincronizar AGENTS.md | `skill-sync` | Ejecutá `./skills/skill-sync/assets/sync.sh` |
| Registrar mejoras | `feedback-loop` | Lee `skills/feedback-loop/SKILL.md` |

---

## Reglas Globales (Siempre Aplican)

Estas reglas son **NON-NEGOTIABLE** y aplican a TODO el código:

### Type Safety
```typescript
// FORBIDDEN - Instant rejection
const data: any = await fetch(...)
function process(input: any): any

// REQUIRED - Always explicit types
const data: UserResponse = await fetchUser(id)
function process(input: ProcessInput): ProcessOutput
```

### No Enums
```typescript
// FORBIDDEN
enum UserRole { Admin = 'ADMIN', User = 'USER' }

// REQUIRED - const assertion
const USER_ROLES = { Admin: 'ADMIN', User: 'USER' } as const
type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
```

### Server-First (Next.js)
- Server Components por defecto
- Client Components solo para interactividad
- NUNCA useEffect para data fetching
- NUNCA API routes para operaciones internas

### Security
- Validar TODO input con Zod
- RLS en TODAS las tablas de Supabase
- NUNCA confiar en checks client-side
- NUNCA exponer errores internos al usuario

### Imports
```typescript
// 1. React/Next.js core
import { Suspense } from 'react'
import { notFound } from 'next/navigation'

// 2. External libraries
import { z } from 'zod'

// 3. Internal aliases (alphabetical)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

### Naming Conventions
| Entity | Convention | Example |
|--------|------------|---------|
| Files (components) | `kebab-case.tsx` | `user-profile-card.tsx` |
| Files (utilities) | `kebab-case.ts` | `format-date.ts` |
| React Components | `PascalCase` | `UserProfileCard` |
| Functions | `camelCase` | `formatUserDate` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| Types/Interfaces | `PascalCase` | `UserProfile` |
| Zod Schemas | `camelCase` + `Schema` | `userProfileSchema` |

---

## Flujo de Trabajo

```
Usuario pide algo
    ↓
1. Analizá la tarea - identificá dominio y tecnologías
    ↓
2. Cargá el agente del dominio (si aplica)
    ↓
3. Cargá los skills necesarios (leé cada SKILL.md)
    ↓
4. Escribí el código siguiendo TODOS los patrones
    ↓
5. Verificá contra los checklists de cada skill
```

---

## Índice Rápido de Skills

Ver `skills/_index.md` para una tabla completa de todos los skills disponibles.

## Referencia Completa

Para reglas detalladas, tablas de auto-invoke, y arquitectura completa: `AGENTS.md`

---

*Claude Code Configuration v1.0 | Compatible con ai-library v2.1*
