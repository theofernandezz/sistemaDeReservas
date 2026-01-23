---
name: database
description: |
  Production patterns for Supabase with RLS, Zod schemas, and service layer architecture.
  Trigger: Activated when working with database schemas, migrations, or Supabase queries.
license: MIT
metadata:
  author: ai-library
  version: "2.0"
  scope: [root, backend, auth]
  auto_invoke:
    - "Working with Supabase"
    - "Creating database migrations"
    - "Defining RLS policies"
    - "Database queries and mutations"
    - "Creating Zod schemas for DB"
  patterns:
    - "supabase/**/*"
    - "lib/supabase/**/*"
    - "lib/data/**/*"
---

# Database Engineering - Supabase

> **Core Principle:** Security by default. Every table has RLS. Every input is validated. Zod schemas are the single source of truth for types.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Server Actions        │        Data Functions                  │
│  (Mutations)           │        (Queries)                       │
│  lib/actions/*.ts      │        lib/data/*.ts                   │
└───────────┬────────────┴───────────────┬───────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                 │
│  • Business logic      • Validation (Zod)                       │
│  • Transaction handling • Error mapping                         │
│  lib/services/*.ts                                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Client                               │
│  • Server client (Server Components, Server Actions)            │
│  • Client client (only when absolutely necessary)               │
│  lib/supabase/server.ts | lib/supabase/client.ts               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL + RLS                              │
│  • Row Level Security on EVERY table                            │
│  • Policies enforce access at database level                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Create Tables Without RLS

Every table MUST have Row Level Security enabled with appropriate policies.

```sql
-- ❌ FORBIDDEN - Table without RLS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id)
);
-- DANGER: Anyone can read/write all rows!

-- ✅ CORRECT - RLS enforced from creation
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. Never Trust Client-Side Validation Alone

Always validate on the server with Zod.

```typescript
// ❌ FORBIDDEN - Only client validation
'use client'
function CreateProject() {
  const handleSubmit = async (data: FormData) => {
    // Client validates... then sends directly to DB
    await supabase.from('projects').insert({ name: data.get('name') })
  }
}

// ✅ CORRECT - Server-side Zod validation
'use server'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export async function createProject(formData: FormData) {
  const validated = createProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  // Now safe to insert
  const { data, error } = await supabase
    .from('projects')
    .insert(validated.data)
    .select()
    .single()
  
  // ...
}
```

### 3. Never Use Client Supabase for Sensitive Operations

```typescript
// ❌ FORBIDDEN - Client-side mutations with service role
import { createBrowserClient } from '@supabase/ssr'

// Client component directly mutating data
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NEVER EXPOSE THIS
)

// ✅ CORRECT - Use Server Actions for mutations
// Always use the server client with user's auth context
```

---

## ✅ REQUIRED PATTERNS

### 1. Zod as Single Source of Truth

Define schemas that generate both TypeScript types and validation.

```typescript
// lib/validations/project.ts
import { z } from 'zod'

// Base schema (matches database columns)
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  status: z.enum(['active', 'archived', 'deleted']),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Derived schemas for different contexts
export const createProjectSchema = projectSchema.pick({
  name: true,
  description: true,
})

export const updateProjectSchema = projectSchema.pick({
  name: true,
  description: true,
  status: true,
}).partial()

// Extract types
export type Project = z.infer<typeof projectSchema>
export type CreateProject = z.infer<typeof createProjectSchema>
export type UpdateProject = z.infer<typeof updateProjectSchema>
```

### 2. Supabase Client Setup

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle server component context
          }
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 3. Service Layer Pattern

```typescript
// lib/services/project-service.ts
import { createClient } from '@/lib/supabase/server'
import { 
  createProjectSchema, 
  updateProjectSchema,
  type Project,
  type CreateProject,
  type UpdateProject 
} from '@/lib/validations/project'

export class ProjectService {
  private supabase: Awaited<ReturnType<typeof createClient>>

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase
  }

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new DatabaseError('Failed to fetch project', error)
    }

    return data
  }

  async getByUser(userId: string): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new DatabaseError('Failed to fetch projects', error)
    }

    return data
  }

  async create(input: CreateProject, userId: string): Promise<Project> {
    // Validate input
    const validated = createProjectSchema.parse(input)

    const { data, error } = await this.supabase
      .from('projects')
      .insert({
        ...validated,
        user_id: userId,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Failed to create project', error)
    }

    return data
  }

  async update(id: string, input: UpdateProject): Promise<Project> {
    const validated = updateProjectSchema.parse(input)

    const { data, error } = await this.supabase
      .from('projects')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Failed to update project', error)
    }

    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      throw new DatabaseError('Failed to delete project', error)
    }
  }
}

// Custom error class
export class DatabaseError extends Error {
  constructor(message: string, public cause: unknown) {
    super(message)
    this.name = 'DatabaseError'
  }
}
```

### 4. Data Access Layer

```typescript
// lib/data/projects.ts
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProjectService } from '@/lib/services/project-service'

// Cached data fetchers for Server Components
export const getProject = cache(async (id: string) => {
  const supabase = await createClient()
  const service = new ProjectService(supabase)
  return service.getById(id)
})

export const getUserProjects = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const service = new ProjectService(supabase)
  return service.getByUser(user.id)
})

// Preload for route transitions
export const preloadProject = (id: string) => {
  void getProject(id)
}
```

### 5. Server Actions with Service Layer

```typescript
// lib/actions/projects.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectService, DatabaseError } from '@/lib/services/project-service'
import { createProjectSchema } from '@/lib/validations/project'
import { z } from 'zod'

export type ActionState = {
  errors?: Record<string, string[]>
  message?: string
  success?: boolean
}

export async function createProject(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { errors: { _form: ['Not authenticated'] } }
  }

  // Validate
  const rawInput = {
    name: formData.get('name'),
    description: formData.get('description'),
  }

  try {
    const validated = createProjectSchema.parse(rawInput)
    
    const service = new ProjectService(supabase)
    const project = await service.create(validated, user.id)

    revalidatePath('/projects')
    redirect(`/projects/${project.id}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: error.flatten().fieldErrors as Record<string, string[]> }
    }
    if (error instanceof DatabaseError) {
      return { errors: { _form: [error.message] } }
    }
    throw error // Re-throw unexpected errors
  }
}
```

---

## 📊 Database Schema Conventions

### Table Structure

```sql
-- Standard table template
CREATE TABLE table_name (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business columns
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Timestamps (always include)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- For soft deletes
);

-- Always add updated_at trigger
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Common Trigger Function

```sql
-- Create once, use everywhere
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Indexing Strategy

```sql
-- Foreign keys (always index)
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Frequently filtered columns
CREATE INDEX idx_projects_status ON projects(status) WHERE status != 'deleted';

-- Compound indexes for common queries
CREATE INDEX idx_projects_user_status ON projects(user_id, status);

-- Full-text search
CREATE INDEX idx_projects_search ON projects USING gin(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
```

---

## 🔐 RLS Policy Patterns

### User-Owned Resources

```sql
-- User can only access their own data
CREATE POLICY "Users own their data"
  ON user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Organization-Based Access

```sql
-- Users can access org data if they're a member
CREATE POLICY "Org members can view"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can modify"
  ON projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );
```

### Public Read, Auth Write

```sql
-- Anyone can read, only owner can write
CREATE POLICY "Public read"
  ON blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "Author can manage"
  ON blog_posts FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
```

---

## 📁 File Structure

```
lib/
├── supabase/
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client
│   └── middleware.ts      # Auth refresh middleware
├── services/
│   ├── project-service.ts
│   ├── user-service.ts
│   └── base-service.ts    # Common CRUD operations
├── data/
│   ├── projects.ts        # Cached fetchers
│   └── users.ts
├── validations/
│   ├── project.ts         # Zod schemas
│   └── user.ts
└── actions/
    ├── projects.ts        # Server Actions
    └── auth.ts

supabase/
├── migrations/
│   ├── 20240101000000_initial_schema.sql
│   └── 20240102000000_add_projects.sql
├── seed.sql
└── config.toml

types/
└── database.ts            # Generated types (supabase gen types)
```

---

## 🔧 Type Generation

```bash
# Generate TypeScript types from Supabase schema
pnpm supabase gen types typescript --project-id $PROJECT_ID > types/database.ts

# Or for local development
pnpm supabase gen types typescript --local > types/database.ts
```

---

## 📋 Database Checklist Before Commit

- [ ] RLS enabled on ALL tables
- [ ] Policies defined for SELECT, INSERT, UPDATE, DELETE
- [ ] Foreign keys have ON DELETE behavior defined
- [ ] Indexes created for foreign keys and frequent filters
- [ ] `created_at` and `updated_at` on all tables
- [ ] Zod schemas match database structure
- [ ] Types generated and up to date
- [ ] Migrations tested locally before push

---

*Skill Version: 2.0.0 | Compatible with Supabase 2.x & PostgreSQL 15+*
