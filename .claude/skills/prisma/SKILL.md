---
name: Prisma ORM Patterns
description: |
  Production Prisma patterns with PostgreSQL and Neon serverless.
  Covers schema design, client singleton, service layer, transactions, and migrations.
  Trigger: Activated when working with Prisma schema, queries, migrations, or database models.
license: MIT
metadata:
  author: ai-library
  version: "1.0"
  scope: [root, backend]
  auto_invoke:
    - "Working with Prisma schema"
    - "Writing Prisma queries"
    - "Creating database models"
    - "Running migrations"
    - "Database service layer"
    - "Working with PostgreSQL via Neon"
  patterns:
    - "prisma/**/*.prisma"
    - "lib/db/**/*.ts"
    - "lib/services/**/*.ts"
    - "prisma/seed.ts"
---

# Prisma ORM Patterns

> **Core Principle:** Prisma is your type-safe interface to PostgreSQL. Keep all database access in a **service layer** — never write raw Prisma queries inside Server Actions, API routes, or components directly.

---

## 🆕 What's New

> **Instruction for Claude:** When this skill is loaded, check this table and mention any entry relevant to what the developer is working on — before writing code.

| Version | Change | Affects |
|---------|--------|---------|
| Prisma 6 | `prisma generate --no-engine` — generates lightweight client without query engine binary (for edge runtimes) | Vercel Edge, Cloudflare Workers |
| Prisma 6 | `omit` in queries — exclude specific fields instead of listing all included ones. Example: `omit: { passwordHash: true }` | Any query that hides sensitive columns |
| Prisma 6 | `prisma.client.$transaction` now supports `isolation level` option | Critical write operations |
| Prisma 6 | `driverAdapters` is **GA** — remove it from `previewFeatures` in `schema.prisma`. Keeping it there causes a deprecation warning in Prisma 6. | All projects using Neon/PlanetScale adapters |

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Import Prisma Directly in Routes or Actions

```typescript
// ❌ FORBIDDEN - Raw Prisma in a Server Action
'use server'
import { prisma } from '@/lib/db'

export async function createUserAction(data: CreateUserInput) {
  // This bypasses validation, error handling, and the service layer
  return prisma.user.create({ data })
}

// ✅ CORRECT - Use the service layer
'use server'
import { userService } from '@/lib/services/user-service'

export async function createUserAction(data: CreateUserInput) {
  return userService.create(data)
}
```

### 2. Never Create Multiple Prisma Client Instances

```typescript
// ❌ FORBIDDEN - New client per file (causes connection pool exhaustion)
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ✅ CORRECT - Always import the singleton
import { prisma } from '@/lib/db'
```

### 3. Never Use `any` with Prisma Types

```typescript
// ❌ FORBIDDEN
async function getUser(id: string): Promise<any> {
  return prisma.user.findUnique({ where: { id } })
}

// ✅ CORRECT - Use Prisma generated types
import type { User } from '@prisma/client'

async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}
```

### 4. Never Expose Database Models Directly to the Client

```typescript
// ❌ FORBIDDEN - Returning raw DB model (may expose sensitive fields)
export async function getUserAction(id: string) {
  return prisma.user.findUnique({ where: { id } }) // includes passwordHash!
}

// ✅ CORRECT - Always select explicit fields or use a DTO
export async function getUserAction(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      // passwordHash: NOT included
    },
  })
}
```

---

## ✅ REQUIRED PATTERNS

### 1. Prisma Client Singleton (Serverless-Safe)

For **Neon** (serverless PostgreSQL), use the Neon serverless adapter to avoid connection limits:

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

function createPrismaClient() {
  // Neon serverless adapter — uses HTTP instead of long-lived TCP connections
  const sql = neon(process.env.DATABASE_URL!)
  const adapter = new PrismaNeon(sql)
  return new PrismaClient({ adapter })
}

// Singleton — reuses the instance in dev (avoids hot-reload exhaustion)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

> **Why Neon adapter?** Neon's serverless driver uses HTTP requests instead of persistent TCP connections, which is required in serverless environments (Vercel, Fly.io with scale-to-zero) where long-lived connections are not viable.

### 2. Schema Design

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  // driverAdapters is GA in Prisma 6 — do NOT list it in previewFeatures
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Enums (use string unions in TS, but enums are fine in Prisma schema) ──
enum UserRole {
  USER
  ADMIN
  MODERATOR
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// ── Models ────────────────────────────────────────────────────────────────
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete

  posts     Post[]
  profile   Profile?

  @@index([email])
  @@index([createdAt])
  @@map("users") // Snake_case table name
}

model Profile {
  id        String  @id @default(cuid())
  bio       String?
  avatarUrl String?
  userId    String  @unique

  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Post {
  id          String     @id @default(cuid())
  title       String
  slug        String     @unique
  content     String
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?  // Soft delete
  authorId    String

  author      User       @relation(fields: [authorId], references: [id])
  tags        PostTag[]

  @@index([slug])
  @@index([authorId])
  @@index([status, publishedAt])
  @@map("posts")
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  posts PostTag[]

  @@map("tags")
}

// Explicit many-to-many join table
model PostTag {
  postId String
  tagId  String

  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}
```

**Schema rules:**
- Always use `cuid()` or `uuid()` for IDs — never auto-increment integers
- Always add `@@map` with snake_case table names
- Always add `@@index` on columns used in `WHERE` or `ORDER BY`
- Use `@updatedAt` on every mutable model
- Add `deletedAt DateTime?` for soft deletes

### 3. Service Layer Pattern

```typescript
// lib/services/user-service.ts
import { prisma } from '@/lib/db'
import { Prisma, type User } from '@prisma/client'
import { hashPassword } from '@/lib/auth/password'

// ── Types ─────────────────────────────────────────────────────────────────

// Use Prisma.validator for type-safe input shapes
const userWithProfile = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { profile: true },
})
export type UserWithProfile = Prisma.UserGetPayload<typeof userWithProfile>

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect

export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>

// ── Service ───────────────────────────────────────────────────────────────

export const userService = {
  async findById(id: string): Promise<UserPublic | null> {
    return prisma.user.findUnique({
      where: { id, deletedAt: null }, // Soft delete filter
      select: userPublicSelect,
    })
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email, deletedAt: null },
    })
  },

  async findWithProfile(id: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
      ...userWithProfile,
    })
  },

  async create(data: {
    email: string
    name: string
    password: string
  }): Promise<UserPublic> {
    const passwordHash = await hashPassword(data.password)

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        profile: {
          create: {}, // Create empty profile automatically
        },
      },
      select: userPublicSelect,
    })
  },

  async update(id: string, data: Prisma.UserUpdateInput): Promise<UserPublic> {
    return prisma.user.update({
      where: { id },
      data,
      select: userPublicSelect,
    })
  },

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  },
}
```

### 4. Transactions

```typescript
// lib/services/post-service.ts
import { prisma } from '@/lib/db'

export const postService = {
  // Use $transaction for multi-step operations that must succeed together
  async publish(postId: string, tagNames: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Step 1: Update post status
      await tx.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })

      // Step 2: Upsert tags and create join records
      const tags = await Promise.all(
        tagNames.map((name) =>
          tx.tag.upsert({
            where: { name },
            create: { name },
            update: {},
          })
        )
      )

      // Step 3: Link tags to post
      await tx.postTag.createMany({
        data: tags.map((tag) => ({ postId, tagId: tag.id })),
        skipDuplicates: true,
      })
    })
  },

  // Interactive transaction with manual commit/rollback control
  async transferCredits(fromId: string, toId: string, amount: number) {
    return prisma.$transaction(
      async (tx) => {
        const from = await tx.user.findUniqueOrThrow({ where: { id: fromId } })

        if (from.credits < amount) {
          throw new Error('Insufficient credits')
        }

        const [updatedFrom, updatedTo] = await Promise.all([
          tx.user.update({
            where: { id: fromId },
            data: { credits: { decrement: amount } },
          }),
          tx.user.update({
            where: { id: toId },
            data: { credits: { increment: amount } },
          }),
        ])

        return { from: updatedFrom, to: updatedTo }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  },
}
```

### 5. Cursor-Based Pagination

```typescript
// lib/services/post-service.ts
interface PaginationArgs {
  cursor?: string
  limit?: number
  orderBy?: 'newest' | 'oldest'
}

interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export const postService = {
  async paginate(args: PaginationArgs): Promise<PaginatedResult<PostPublic>> {
    const limit = Math.min(args.limit ?? 20, 100) // Cap at 100
    const take = limit + 1 // Fetch one extra to detect hasMore

    const items = await prisma.post.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      orderBy: { publishedAt: args.orderBy === 'oldest' ? 'asc' : 'desc' },
      take,
      ...(args.cursor && {
        cursor: { id: args.cursor },
        skip: 1, // Skip the cursor item itself
      }),
      select: postPublicSelect,
    })

    const hasMore = items.length > limit
    if (hasMore) items.pop() // Remove the extra item

    return {
      items,
      hasMore,
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    }
  },
}
```

### 6. `Prisma.validator` for Reusable Type-Safe Shapes

```typescript
// lib/db/selects.ts - Centralize your reusable select/include shapes

import { Prisma } from '@prisma/client'

export const postWithAuthor = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    author: {
      select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
    },
    tags: { include: { tag: true } },
  },
})

export type PostWithAuthor = Prisma.PostGetPayload<typeof postWithAuthor>

// Usage in service
const post = await prisma.post.findUnique({
  where: { id },
  ...postWithAuthor,
})
// `post` is fully typed as PostWithAuthor
```

### 7. Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')

  // Upsert (safe to re-run)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      passwordHash: await hashPassword('password123'),
      profile: { create: { bio: 'Platform admin' } },
    },
  })

  await prisma.post.upsert({
    where: { slug: 'hello-world' },
    update: {},
    create: {
      title: 'Hello World',
      slug: 'hello-world',
      content: 'First post!',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: admin.id,
    },
  })

  console.log('✅ Done')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

```json
// package.json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 🔄 Migration Workflow

```bash
# 1. Edit prisma/schema.prisma

# 2. Create and apply migration (dev)
npx prisma migrate dev --name add_posts_table

# 3. Generate Prisma Client after schema changes
npx prisma generate

# 4. Apply migrations in production (no dev scaffolding)
npx prisma migrate deploy

# 5. Inspect DB in browser
npx prisma studio

# 6. Reset DB + re-run all migrations + seed (dev only)
npx prisma migrate reset
```

> ⚠️ **Never run `migrate reset` in production.** It drops all data.

---

## 🔧 Required Dependencies

```bash
# Core
npm install prisma @prisma/client

# Neon serverless adapter
npm install @neondatabase/serverless @prisma/adapter-neon

# Dev
npm install -D prisma tsx
```

```env
# .env.local
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

---

## 📁 File Structure

```
prisma/
├── schema.prisma          # Single schema file
├── migrations/            # Auto-generated migration files
│   └── 20260225_init/
│       └── migration.sql
└── seed.ts                # Seed script

lib/
├── db.ts                  # Prisma singleton
├── db/
│   └── selects.ts         # Shared Prisma.validator shapes
└── services/
    ├── user-service.ts    # One file per model
    ├── post-service.ts
    └── tag-service.ts
```

---

## 📋 Checklist Before Commit

- [ ] Prisma client imported from `@/lib/db` (singleton), not instantiated directly
- [ ] All DB access goes through the service layer, not raw Prisma in routes/actions
- [ ] `select` used to avoid exposing sensitive fields
- [ ] Soft-delete models filtered with `deletedAt: null` in all queries
- [ ] New model has `@@map`, `@@index`, and `@updatedAt`
- [ ] `$transaction` used for multi-step mutations
- [ ] Migration created with `prisma migrate dev --name <descriptive-name>`
- [ ] `prisma generate` run after schema changes

---

*Skill Version: 1.1.0 | Prisma 6.x + PostgreSQL (Neon) + Next.js 16 | Last verified: 2026-03-31*
