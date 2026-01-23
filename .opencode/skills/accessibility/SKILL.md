---
name: accessibility
description: |
  Accessibility patterns for inclusive web applications. WCAG 2.1 AA compliance, ARIA, keyboard navigation.
  Trigger: Activated when creating interactive components, forms, or discussing accessibility.
license: MIT
metadata:
  author: ai-library
  version: "1.0"
  scope: [root, ui]
  auto_invoke:
    - "Creating interactive components"
    - "Adding keyboard navigation"
    - "Screen reader support"
    - "ARIA attributes"
    - "Accessibility audit"
  patterns:
    - "components/**/*.tsx"
    - "app/**/*.tsx"
---

# Accessibility (a11y)

> **Core Principle:** Build for everyone. If it's not accessible, it's not complete.

---

## 🎯 Target: WCAG 2.1 AA

| Principle | Meaning |
|-----------|---------|
| **Perceivable** | Content can be perceived by all senses |
| **Operable** | Interface can be operated by all users |
| **Understandable** | Content and UI are understandable |
| **Robust** | Works with assistive technologies |

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Use Non-Semantic Elements for Interactivity

```typescript
// ❌ FORBIDDEN - div is not focusable/keyboard accessible
<div onClick={handleClick}>Click me</div>

// ❌ FORBIDDEN - span as button
<span className="button" onClick={handleClick}>Submit</span>

// ✅ CORRECT - Use semantic elements
<button onClick={handleClick}>Click me</button>

// ✅ CORRECT - If you MUST use div, add role and keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

### 2. Never Hide Focus Indicators

```css
/* ❌ FORBIDDEN - Removes focus visibility */
*:focus {
  outline: none;
}

button:focus {
  outline: 0;
}

/* ✅ CORRECT - Custom focus style */
*:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* ✅ CORRECT - Using Tailwind */
.focus-visible:ring-2 .focus-visible:ring-blue-500 .focus-visible:ring-offset-2
```

### 3. Never Use Color Alone to Convey Information

```typescript
// ❌ FORBIDDEN - Color only
<span className={isError ? 'text-red-500' : 'text-green-500'}>
  Status
</span>

// ✅ CORRECT - Color + icon + text
<span className={isError ? 'text-red-500' : 'text-green-500'}>
  {isError ? (
    <>
      <XCircle aria-hidden="true" />
      <span>Error: {message}</span>
    </>
  ) : (
    <>
      <CheckCircle aria-hidden="true" />
      <span>Success: {message}</span>
    </>
  )}
</span>
```

### 4. Never Skip Heading Levels

```typescript
// ❌ FORBIDDEN - Skipping h2
<h1>Page Title</h1>
<h3>Section Title</h3>

// ✅ CORRECT - Sequential headings
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

---

## ✅ REQUIRED PATTERNS

### 1. Images Must Have Alt Text

```typescript
// Informative images - describe the content
<Image
  src="/hero.jpg"
  alt="Team collaborating around a whiteboard"
  width={800}
  height={600}
/>

// Decorative images - empty alt
<Image
  src="/decorative-pattern.svg"
  alt=""
  aria-hidden="true"
  width={100}
  height={100}
/>

// Complex images - describe in context
<figure>
  <Image src="/chart.png" alt="Sales chart" width={600} height={400} />
  <figcaption>
    Q4 2025 sales increased 25% compared to Q3, reaching $1.2M in revenue.
  </figcaption>
</figure>
```

### 2. Form Labels and Error Messages

```typescript
// ✅ REQUIRED - Label associated with input
<div>
  <label htmlFor="email">Email address</label>
  <input
    id="email"
    type="email"
    aria-describedby="email-error email-hint"
    aria-invalid={!!errors.email}
  />
  <p id="email-hint" className="text-sm text-muted">
    We'll never share your email
  </p>
  {errors.email && (
    <p id="email-error" role="alert" className="text-sm text-red-500">
      {errors.email.message}
    </p>
  )}
</div>

// ✅ REQUIRED - Button with loading state
<button
  type="submit"
  disabled={isLoading}
  aria-busy={isLoading}
>
  {isLoading ? 'Submitting...' : 'Submit'}
</button>
```

### 3. Modal/Dialog Accessibility

```typescript
'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and escape key
  useEffect(() => {
    if (!isOpen) return

    // Focus first focusable element
    closeButtonRef.current?.focus()

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal-content">
        <h2 id="modal-title">{title}</h2>
        {children}
        <button ref={closeButtonRef} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
```

### 4. Skip Navigation Link

```typescript
// app/[locale]/layout.tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {/* Skip link - first focusable element */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black"
        >
          Skip to main content
        </a>

        <header>...</header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer>...</footer>
      </body>
    </html>
  )
}
```

### 5. Live Regions for Dynamic Content

```typescript
// Announce changes to screen readers
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {notification}
</div>

// For urgent announcements
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Toast notification component
export function Toast({ message, type }: ToastProps) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="toast"
    >
      {message}
    </div>
  )
}
```

### 6. Keyboard Navigation for Custom Components

```typescript
// Custom dropdown with keyboard support
function Dropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen) {
          onChange(options[focusedIndex])
          setIsOpen(false)
        } else {
          setIsOpen(true)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <span>{value}</span>
      {isOpen && (
        <ul role="listbox">
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={index === focusedIndex}
              onClick={() => onChange(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## 🎨 Screen Reader Only Utility

```css
/* globals.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.not-sr-only {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## 🔧 ARIA Quick Reference

| Attribute | Use Case |
|-----------|----------|
| `aria-label` | When no visible label exists |
| `aria-labelledby` | Reference another element's text |
| `aria-describedby` | Additional description (hints, errors) |
| `aria-hidden="true"` | Hide decorative elements from AT |
| `aria-live` | Announce dynamic content changes |
| `aria-expanded` | Toggle buttons, accordions |
| `aria-current="page"` | Current page in navigation |
| `role="alert"` | Urgent announcements |
| `role="status"` | Non-urgent status updates |

---

## 🧪 Testing Accessibility

```bash
# Automated testing
pnpm add -D @axe-core/react axe-core

# In development
pnpm add -D eslint-plugin-jsx-a11y
```

```typescript
// __tests__/setup.ts - Axe in tests
import { configureAxe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// Usage in tests
it('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## 📋 Checklist Before Commit

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Images have appropriate alt text
- [ ] Form inputs have labels
- [ ] Error messages are announced
- [ ] Color is not the only way to convey information
- [ ] Heading levels are sequential
- [ ] No axe violations in automated tests

---

*Skill Version: 1.0.0 | WCAG 2.1 AA Target*
