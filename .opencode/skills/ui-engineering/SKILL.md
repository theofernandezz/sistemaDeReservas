---
name: ui-engineering
description: |
  Premium UI patterns with Linear-inspired aesthetics, Tailwind v4, Shadcn UI and Aceternity UI.
  Trigger: Activated when creating/styling components or working on UI patterns.
license: MIT
metadata:
  author: ai-library
  version: "2.0"
  scope: [root, ui]
  auto_invoke:
    - "Creating/styling components"
    - "Working with Tailwind classes"
    - "Using Shadcn UI components"
    - "Adding animations (Aceternity)"
    - "Design system work"
  patterns:
    - "components/**/*.tsx"
    - "app/**/page.tsx"
    - "**/*.css"
---

# UI Engineering - Linear Style

> **Core Principle:** Craft interfaces that feel premium, responsive, and alive. Every pixel matters. Every interaction should feel intentional and delightful.

---

## 🎨 Design Philosophy: Linear Style

The "Linear Style" is characterized by:

| Aspect | Description |
|--------|-------------|
| **Subtle Borders** | 1px borders with low opacity (`border-white/10`) |
| **Glassmorphism** | Backdrop blur with translucent backgrounds |
| **Micro-interactions** | Smooth transitions on every interactive element |
| **Dark-first** | Designed for dark mode, light mode as adaptation |
| **Depth through Shadow** | Layered shadows for elevation hierarchy |
| **Precision Spacing** | 4px grid system, consistent rhythm |

---

## 🧩 Component Libraries: Shadcn UI vs Aceternity UI

Use **both libraries** strategically based on their strengths:

### Shadcn UI — Core Primitives & Forms

Use Shadcn for **functional, accessible components** that need to be reliable and composable.

| Component Type | Examples |
|---------------|----------|
| **Form Controls** | Input, Textarea, Select, Checkbox, Radio, Switch, Slider |
| **Dialogs & Overlays** | Dialog, Sheet, Popover, Tooltip, Dropdown Menu |
| **Data Display** | Table, Accordion, Tabs, Separator |
| **Feedback** | Alert, Toast, Progress, Skeleton |
| **Navigation** | Navigation Menu, Breadcrumb, Pagination |
| **Buttons & Actions** | Button, Toggle, Toggle Group |

```tsx
// ✅ Use Shadcn for forms and core UI
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
```

### Aceternity UI — Animations & Visual Impact

Use Aceternity for **eye-catching, animated components** that create visual wow-factor.

| Component Type | Examples |
|---------------|----------|
| **Hero Sections** | Spotlight, Lamp, Vortex, Aurora Background |
| **Backgrounds** | Dot Background, Grid Background, Beams, Particles |
| **Cards & Containers** | 3D Card, Hover Effect Cards, Glowing Cards |
| **Text Effects** | Text Generate, Typewriter, Text Reveal, Wavy Text |
| **Scroll Effects** | Scroll Reveal, Parallax Scroll, Sticky Scroll |
| **Interactive Elements** | Floating Dock, Moving Border, Sparkles |
| **Navigation** | Floating Navbar, Sidebar with animation |

```tsx
// ✅ Use Aceternity for visual impact
import { SpotlightCard } from '@/components/aceternity/spotlight-card'
import { BackgroundBeams } from '@/components/aceternity/background-beams'
import { TextGenerateEffect } from '@/components/aceternity/text-generate-effect'
import { FloatingDock } from '@/components/aceternity/floating-dock'
```

### Decision Matrix

| Need | Use | Reason |
|------|-----|--------|
| Form with validation | **Shadcn** | Accessible, works with react-hook-form |
| Hero section for landing | **Aceternity** | Visual impact, animations |
| Modal/Dialog | **Shadcn** | Proper focus management, a11y |
| Animated card hover effects | **Aceternity** | 3D transforms, glow effects |
| Data table | **Shadcn** | Sorting, filtering, pagination |
| Background effects | **Aceternity** | Beams, particles, grids |
| Dropdown menu | **Shadcn** | Keyboard navigation, ARIA |
| Text animations | **Aceternity** | Typewriter, reveal effects |
| Toast notifications | **Shadcn** | Consistent, accessible |
| Floating navigation | **Aceternity** | Dock effect, animations |

### File Organization

```
components/
├── ui/                    # Shadcn primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
├── aceternity/            # Aceternity components
│   ├── spotlight-card.tsx
│   ├── background-beams.tsx
│   ├── text-generate-effect.tsx
│   └── ...
├── patterns/              # Composed patterns (mix both)
│   ├── hero-section.tsx   # Aceternity background + Shadcn CTAs
│   └── feature-card.tsx   # Aceternity effects + Shadcn content
└── [feature]/
    └── ...
```

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Use `@apply` in CSS

`@apply` defeats Tailwind's purpose and creates maintenance nightmares.

```css
/* ❌ FORBIDDEN - Creates hidden dependencies */
.custom-button {
  @apply bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600;
}

/* ✅ CORRECT - Use component composition */
```

```typescript
// Button component with configurable variants
const Button = ({ variant = 'primary', ...props }) => (
  <button
    className={cn(
      "px-4 py-2 rounded-lg transition-colors",
      variant === 'primary' && "bg-blue-500 text-white hover:bg-blue-600",
      variant === 'secondary' && "bg-gray-100 text-gray-800 hover:bg-gray-200"
    )}
    {...props}
  />
)
```

### 2. Never Hardcode Colors

Always use design tokens for consistency and theming.

```typescript
// ❌ FORBIDDEN - Hardcoded colors
<div className="bg-[#1a1a2e] text-[#ffffff]">

// ✅ CORRECT - Design tokens via CSS variables
<div className="bg-background text-foreground">

// ✅ CORRECT - Semantic color names
<div className="bg-card text-card-foreground border-border">
```

### 3. Never Skip Transitions

Every state change needs smooth transitions.

```typescript
// ❌ FORBIDDEN - Jarring state changes
<button className="bg-primary hover:bg-primary-dark">

// ✅ CORRECT - Smooth transitions
<button className="bg-primary hover:bg-primary-dark transition-colors duration-150">

// ✅ BETTER - Include transform for depth
<button className="bg-primary hover:bg-primary-dark hover:scale-[1.02] 
                   transition-all duration-150 active:scale-[0.98]">
```

---

## ✅ REQUIRED PATTERNS

### 1. The `cn()` Utility is Mandatory

All className assemblies MUST use the `cn()` utility for merge conflict resolution.

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```typescript
// Usage in components
import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  variant?: 'default' | 'glass'
  children: React.ReactNode
}

export function Card({ className, variant = 'default', children }: CardProps) {
  return (
    <div
      className={cn(
        // Base styles
        "rounded-xl border p-6",
        // Variant styles
        variant === 'default' && "bg-card border-border",
        variant === 'glass' && [
          "bg-white/5 border-white/10",
          "backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        ],
        // Allow override
        className
      )}
    >
      {children}
    </div>
  )
}
```

### 2. Glassmorphism Implementation

```typescript
// Glass card component
export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        // Glass effect base
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-white/10 to-white/5",
        "border border-white/10",
        "backdrop-blur-xl",
        
        // Subtle inner glow
        "before:absolute before:inset-0",
        "before:bg-gradient-to-br before:from-white/5 before:to-transparent",
        "before:rounded-2xl before:pointer-events-none",
        
        // Shadow for depth
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        "shadow-black/20",
        
        className
      )}
    >
      {children}
    </div>
  )
}

// Glass input field
export function GlassInput({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full px-4 py-3 rounded-lg",
        "bg-white/5 border border-white/10",
        "text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "focus:border-primary/50",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}
```

### 3. Micro-Interactions Library

```typescript
// Hover lift effect
const hoverLift = "hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"

// Press effect
const pressEffect = "active:scale-[0.98] transition-transform duration-75"

// Focus ring (accessible)
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Shimmer loading effect
const shimmer = `
  relative overflow-hidden
  before:absolute before:inset-0
  before:-translate-x-full before:animate-[shimmer_2s_infinite]
  before:bg-gradient-to-r before:from-transparent 
  before:via-white/10 before:to-transparent
`

// Usage in component
export function InteractiveCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "p-6 rounded-xl bg-card border border-border",
      "cursor-pointer select-none",
      hoverLift,
      pressEffect,
      focusRing
    )}>
      {children}
    </div>
  )
}
```

### 4. Animation Keyframes (Tailwind v4)

```css
/* globals.css */
@theme {
  --animate-shimmer: shimmer 2s infinite;
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
  --animate-scale-in: scale-in 0.2s ease-out;
  --animate-pulse-soft: pulse-soft 2s infinite;
}

@keyframes shimmer {
  100% { transform: translateX(100%); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### 5. Component Composition over Configuration

```typescript
// ❌ AVOID - Prop-heavy components
<Button
  variant="primary"
  size="large"
  icon={<Plus />}
  iconPosition="left"
  loading={isLoading}
  disabled={isDisabled}
  fullWidth
  rounded="lg"
>
  Create Project
</Button>

// ✅ PREFERRED - Composition pattern
<Button size="lg" className="w-full">
  {isLoading ? (
    <Spinner className="size-4" />
  ) : (
    <Plus className="size-4" />
  )}
  Create Project
</Button>

// ✅ EVEN BETTER - Slot pattern for complex layouts
<Card>
  <Card.Header>
    <Card.Title>Settings</Card.Title>
    <Card.Description>Manage your preferences</Card.Description>
  </Card.Header>
  <Card.Content>
    {/* Content */}
  </Card.Content>
  <Card.Footer>
    <Button variant="ghost">Cancel</Button>
    <Button>Save</Button>
  </Card.Footer>
</Card>
```

---

## 🎨 Color System (Dark-First)

```css
/* globals.css - Design Tokens */
@layer base {
  :root {
    /* Light mode */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --border: 240 5.9% 90%;
  }
  
  .dark {
    /* Dark mode - Linear inspired */
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 6%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --muted: 240 5% 15%;
    --muted-foreground: 240 5% 55%;
    --border: 240 5% 15%;
    
    /* Accent colors */
    --accent-blue: 217 91% 60%;
    --accent-purple: 262 83% 58%;
    --accent-green: 142 71% 45%;
    --accent-orange: 24 95% 53%;
    --accent-red: 0 84% 60%;
  }
}
```

---

## 📐 Spacing System

Follow an 8px base grid with 4px for fine adjustments.

```typescript
// Spacing scale (Tailwind default + custom)
const spacing = {
  px: '1px',
  0.5: '2px',   // Fine adjustment
  1: '4px',     // Fine adjustment  
  2: '8px',     // Base unit
  3: '12px',
  4: '16px',    // 2x base
  5: '20px',
  6: '24px',    // 3x base
  8: '32px',    // 4x base
  10: '40px',
  12: '48px',   // 6x base
  16: '64px',   // 8x base
}

// ✅ CORRECT - Consistent spacing
<div className="p-6 space-y-4">      {/* 24px padding, 16px gap */}
  <h2 className="mb-2">Title</h2>     {/* 8px margin */}
  <p className="mt-1">Description</p> {/* 4px margin */}
</div>

// ❌ AVOID - Arbitrary values break rhythm
<div className="p-[22px] space-y-[18px]">
```

---

## 🧱 Component Architecture

```
components/
├── ui/                    # Shadcn primitives (forms, dialogs, data)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── dialog.tsx
├── aceternity/            # Aceternity effects (animations, backgrounds)
│   ├── spotlight-card.tsx
│   ├── background-beams.tsx
│   └── floating-dock.tsx
├── patterns/              # Composed patterns (mix both libraries)
│   ├── form-field.tsx
│   ├── page-header.tsx
│   └── empty-state.tsx
└── [feature]/             # Feature-specific
    ├── project-card.tsx
    └── task-list.tsx
```

### Pattern Component Example

```typescript
// components/patterns/page-header.tsx
interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// Usage
<PageHeader
  title="Projects"
  description="Manage your active projects"
  action={<Button><Plus className="size-4 mr-2" /> New Project</Button>}
/>
```

---

## 📱 Responsive Design

Mobile-first with intentional breakpoints.

```typescript
// Breakpoint strategy
const breakpoints = {
  sm: '640px',   // Large phones
  md: '768px',   // Tablets
  lg: '1024px',  // Laptops
  xl: '1280px',  // Desktops
  '2xl': '1536px' // Large screens
}

// ✅ Mobile-first pattern
<div className="
  grid grid-cols-1 gap-4
  sm:grid-cols-2 sm:gap-6
  lg:grid-cols-3
  xl:grid-cols-4
">

// ✅ Hide/show responsive elements
<nav className="hidden md:flex">        {/* Hidden on mobile */}
<MobileNav className="md:hidden" />     {/* Shown only on mobile */}
```

---

## 📋 UI Checklist Before Commit

- [ ] All classNames use `cn()` utility
- [ ] No `@apply` in CSS files
- [ ] No hardcoded color values
- [ ] All interactive elements have transitions
- [ ] Hover, focus, and active states defined
- [ ] Dark mode tested
- [ ] Responsive at all breakpoints
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Focus states are accessible (visible ring)

---

*Skill Version: 2.0.0 | Compatible with Tailwind v4, Shadcn UI & Aceternity UI*
