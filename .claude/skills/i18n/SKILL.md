---
name: Internationalization (i18n) - next-intl
description: |
  Multi-language support patterns with next-intl for Next.js App Router applications.
  Trigger: Activated when working with translations, locales, or multi-language features.
license: MIT
metadata:
  author: ai-library
  version: "1.0"
  scope: [root, ui, backend]
  auto_invoke:
    - "Adding translations"
    - "Multi-language support"
    - "Locale handling"
    - "Working with i18n"
    - "Internationalizing content"
  patterns:
    - "messages/**/*.json"
    - "lib/i18n/**/*.ts"
    - "i18n.ts"
---

# Internationalization (i18n) - next-intl

> **Core Principle:** Never hardcode user-facing strings. All text should come from translation files.

---

## 🆕 What's New

> **Instruction for Claude:** When this skill is loaded, check this table and mention any entry relevant to what the developer is working on — before writing code.

| Version | Change | Affects |
|---------|--------|---------|
| — | No tracked changes yet | — |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Middleware                               │
│  Detects locale from URL, cookie, or Accept-Language header     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    [locale]/layout.tsx                           │
│  Provides NextIntlClientProvider with messages                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   ┌────────────┐    ┌────────────┐    ┌────────────┐
   │  Server    │    │  Client    │    │  Server    │
   │  Component │    │  Component │    │  Actions   │
   │            │    │            │    │            │
   │ getTransla │    │ useTrans   │    │ getTransla │
   │ tions()    │    │ lations()  │    │ tions()    │
   └────────────┘    └────────────┘    └────────────┘
```

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Hardcode User-Facing Strings

```typescript
// ❌ FORBIDDEN - Hardcoded text
function WelcomeBanner() {
  return <h1>Welcome to our platform!</h1>
}

// ❌ FORBIDDEN - Hardcoded in variables
const errorMessage = "Something went wrong"

// ✅ CORRECT - Use translation function
import { useTranslations } from 'next-intl'

function WelcomeBanner() {
  const t = useTranslations('home')
  return <h1>{t('welcome')}</h1>
}
```

### 2. Never Store Translations in Components

```typescript
// ❌ FORBIDDEN - Translations in component
const translations = {
  en: { title: 'Hello' },
  es: { title: 'Hola' },
}

function Component({ locale }: { locale: string }) {
  return <h1>{translations[locale].title}</h1>
}

// ✅ CORRECT - Use message files
// messages/en.json
{
  "common": {
    "title": "Hello"
  }
}

// messages/es.json
{
  "common": {
    "title": "Hola"
  }
}
```

### 3. Never Use String Concatenation for Translations

```typescript
// ❌ FORBIDDEN - Concatenation breaks translation context
const t = useTranslations('cart')
const message = t('you_have') + ' ' + count + ' ' + t('items')

// ✅ CORRECT - Use ICU message format with variables
// messages/en.json: "cartItems": "You have {count} items in your cart"
const message = t('cartItems', { count })

// ✅ CORRECT - Pluralization with ICU
// messages/en.json: "items": "{count, plural, =0 {No items} =1 {1 item} other {# items}}"
const message = t('items', { count })
```

---

## ✅ REQUIRED PATTERNS

### 1. Project Setup

```bash
# Install next-intl
pnpm add next-intl
```

```typescript
// i18n.ts (root)
import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'es', 'pt'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound()

  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

### 2. Middleware Configuration

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Only show /es, /pt, not /en
})

export const config = {
  matcher: ['/', '/(es|pt|en)/:path*'],
}
```

### 3. App Structure with Locale

```
app/
├── [locale]/
│   ├── layout.tsx       # Provides translations
│   ├── page.tsx
│   ├── (marketing)/
│   │   └── page.tsx
│   └── (dashboard)/
│       └── page.tsx
└── api/                 # API routes outside [locale]
    └── webhooks/

messages/
├── en.json
├── es.json
└── pt.json
```

### 4. Root Layout with Provider

```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, Locale } from '@/i18n'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

### 5. Server Components

```typescript
// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server'

export default async function HomePage() {
  const t = await getTranslations('home')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </main>
  )
}
```

### 6. Client Components

```typescript
'use client'

import { useTranslations } from 'next-intl'

export function WelcomeBanner() {
  const t = useTranslations('home')

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  )
}
```

### 7. Server Actions with Translations

```typescript
'use server'

import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

export async function createProject(formData: FormData) {
  const t = await getTranslations('errors')
  
  const schema = z.object({
    name: z.string().min(1, t('required')),
  })

  const validated = schema.safeParse({
    name: formData.get('name'),
  })

  if (!validated.success) {
    return { error: validated.error.flatten() }
  }

  // Create project...
  const successT = await getTranslations('success')
  return { success: true, message: successT('projectCreated') }
}
```

### 8. Language Switcher

```typescript
'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { locales, Locale } from '@/i18n'

const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    // Replace current locale in path
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  )
}
```

---

## 📁 Message File Structure

```json
// messages/en.json
{
  "metadata": {
    "title": "My App",
    "description": "The best app ever"
  },
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "home": {
    "title": "Welcome",
    "subtitle": "Get started with our platform",
    "cta": "Start Free Trial"
  },
  "auth": {
    "signIn": "Sign In",
    "signUp": "Sign Up",
    "signOut": "Sign Out",
    "email": "Email",
    "password": "Password"
  },
  "errors": {
    "required": "This field is required",
    "invalidEmail": "Please enter a valid email",
    "minLength": "Must be at least {min} characters"
  },
  "success": {
    "saved": "Changes saved successfully",
    "deleted": "Item deleted",
    "projectCreated": "Project created successfully"
  }
}
```

### Namespace Organization

| Namespace | Purpose |
|-----------|---------|
| `metadata` | Page titles, SEO descriptions |
| `common` | Shared UI elements (buttons, labels) |
| `home`, `dashboard`, etc. | Page-specific content |
| `auth` | Authentication-related strings |
| `errors` | Error messages |
| `success` | Success messages |

---

## 🔢 Formatting Patterns

### Numbers

```typescript
import { useFormatter } from 'next-intl'

function PriceDisplay({ amount }: { amount: number }) {
  const format = useFormatter()

  return (
    <span>
      {format.number(amount, { style: 'currency', currency: 'USD' })}
    </span>
  )
}
// en: $1,234.56
// es: 1.234,56 US$
```

### Dates

```typescript
import { useFormatter } from 'next-intl'

function DateDisplay({ date }: { date: Date }) {
  const format = useFormatter()

  return (
    <time>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </time>
  )
}
// en: January 16, 2026
// es: 16 de enero de 2026
```

### Relative Time

```typescript
import { useFormatter } from 'next-intl'

function TimeAgo({ date }: { date: Date }) {
  const format = useFormatter()

  return (
    <span>{format.relativeTime(date)}</span>
  )
}
// "2 hours ago", "hace 2 horas"
```

---

## 📁 File Structure

```
project/
├── i18n.ts                    # Configuration
├── middleware.ts              # Locale detection
├── messages/
│   ├── en.json
│   ├── es.json
│   └── pt.json
├── app/
│   └── [locale]/
│       ├── layout.tsx         # Provider
│       └── page.tsx
├── components/
│   └── language-switcher.tsx
└── lib/
    └── i18n/
        └── get-locale.ts      # Utilities
```

---

## 📋 Checklist Before Commit

- [ ] All user-facing strings use translation functions
- [ ] No hardcoded text in components
- [ ] Message files exist for all supported locales
- [ ] Pluralization uses ICU format
- [ ] Dates/numbers use formatters
- [ ] Language switcher works correctly
- [ ] SEO metadata is translated
- [ ] Error messages are translated

---

*Skill Version: 1.0.0 | Compatible with next-intl 3.x & Next.js 16.x*
