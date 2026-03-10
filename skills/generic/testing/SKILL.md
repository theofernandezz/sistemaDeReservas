---
name: Testing Patterns - Vitest
description: |
  Production testing patterns with Vitest and Testing Library for reliable SaaS applications.
  Trigger: Activated when creating or editing test files.
license: MIT
metadata:
  author: ai-library
  version: "2.0"
  scope: [root, testing]
  auto_invoke:
    - "Writing tests"
    - "Creating test files"
    - "Test setup and configuration"
    - "Mocking with MSW"
  patterns:
    - "**/*.test.ts"
    - "**/*.test.tsx"
    - "**/*.spec.ts"
    - "__tests__/**/*"
---

# Testing Patterns - Vitest

> **Core Principle:** Test behavior, not implementation. Every test should survive a refactor.

---

## 🏗️ Testing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      E2E Tests (Playwright)                      │
│  Critical user flows, cross-browser, real environment           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Integration Tests                             │
│  Component + hooks together, mock external APIs only            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      Unit Tests                                  │
│  Pure functions, utilities, isolated logic                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Test Implementation Details

```typescript
// ❌ FORBIDDEN - Testing internal state
it('should set loading to true', () => {
  const { result } = renderHook(() => useData())
  expect(result.current.isLoading).toBe(true)
})

// ❌ FORBIDDEN - Testing internal function calls
it('should call setState', () => {
  const setStateSpy = vi.spyOn(React, 'useState')
  render(<Component />)
  expect(setStateSpy).toHaveBeenCalled()
})

// ✅ CORRECT - Test user-visible behavior
it('should show loading spinner while fetching', () => {
  render(<DataComponent />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})

// ✅ CORRECT - Test outcome, not mechanism
it('should display user name after loading', async () => {
  render(<UserProfile userId="123" />)
  expect(await screen.findByText('John Doe')).toBeInTheDocument()
})
```

### 2. Never Use Arbitrary Timeouts

```typescript
// ❌ FORBIDDEN - Flaky, slow tests
await new Promise(resolve => setTimeout(resolve, 1000))
expect(element).toBeVisible()

// ❌ FORBIDDEN - Magic numbers
await waitFor(() => {}, { timeout: 5000 })

// ✅ CORRECT - Wait for specific condition
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// ✅ CORRECT - Use findBy (auto-waits)
const successMessage = await screen.findByText('Success')
expect(successMessage).toBeInTheDocument()
```

### 3. Never Write Tests Without Assertions

```typescript
// ❌ FORBIDDEN - Test passes but tests nothing
it('should render', () => {
  render(<Component />)
})

// ❌ FORBIDDEN - Just calling functions
it('should work', async () => {
  await fetchData()
})

// ✅ CORRECT - Explicit assertions
it('should render the title', () => {
  render(<Component />)
  expect(screen.getByRole('heading')).toHaveTextContent('Dashboard')
})
```

### 4. Never Mock What You Don't Own

```typescript
// ❌ FORBIDDEN - Mocking React internals
vi.mock('react', () => ({
  useState: vi.fn(),
}))

// ❌ FORBIDDEN - Mocking library internals
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// ✅ CORRECT - Mock your own boundaries
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ data: mockData, error: null }),
    }),
  }),
}))

// ✅ BETTER - Use MSW for API mocking
import { http, HttpResponse } from 'msw'
import { server } from '@/tests/mocks/server'

beforeEach(() => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json([{ id: 1, name: 'John' }])
    })
  )
})
```

---

## ✅ REQUIRED PATTERNS

### 1. Arrange-Act-Assert (AAA)

```typescript
it('should add item to cart', async () => {
  // Arrange - Set up test conditions
  const user = userEvent.setup()
  render(<ProductPage product={mockProduct} />)
  
  // Act - Perform the action
  await user.click(screen.getByRole('button', { name: 'Add to Cart' }))
  
  // Assert - Verify the outcome
  expect(screen.getByText('Added to cart')).toBeInTheDocument()
  expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
})
```

### 2. Testing Library Best Practices

```typescript
// Priority order for queries (most to least recommended):
// 1. getByRole - accessible, semantic
// 2. getByLabelText - form inputs
// 3. getByPlaceholderText - inputs without labels
// 4. getByText - non-interactive content
// 5. getByTestId - last resort

// ✅ PREFERRED - Role-based queries
screen.getByRole('button', { name: 'Submit' })
screen.getByRole('textbox', { name: 'Email' })
screen.getByRole('heading', { level: 1 })
screen.getByRole('link', { name: 'Learn more' })

// ✅ GOOD - Label-based for forms
screen.getByLabelText('Email address')
screen.getByLabelText('Password')

// ⚠️ OK - When semantic queries don't work
screen.getByText('Welcome back!')

// 🔴 LAST RESORT - Test IDs
screen.getByTestId('complex-chart-container')
```

### 3. User Event over FireEvent

```typescript
// ❌ AVOID - fireEvent is synchronous and unrealistic
import { fireEvent } from '@testing-library/react'

fireEvent.click(button)
fireEvent.change(input, { target: { value: 'test' } })

// ✅ PREFERRED - userEvent simulates real user behavior
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()

// Simulates real click (focus, mousedown, mouseup, click)
await user.click(button)

// Simulates real typing (focus, keydown, keypress, input, keyup)
await user.type(input, 'test@email.com')

// Simulates keyboard navigation
await user.tab()
await user.keyboard('{Enter}')
```

### 4. Testing Async Operations

```typescript
// Setup MSW for API mocking
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/user', () => {
    return HttpResponse.json({ id: 1, name: 'John Doe' })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Test async component
it('should load and display user data', async () => {
  render(<UserProfile userId="1" />)
  
  // Wait for loading to finish
  expect(await screen.findByText('John Doe')).toBeInTheDocument()
})

// Test error state
it('should show error when API fails', async () => {
  server.use(
    http.get('/api/user', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    })
  )
  
  render(<UserProfile userId="999" />)
  
  expect(await screen.findByText('User not found')).toBeInTheDocument()
})
```

### 5. Testing Forms

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('LoginForm', () => {
  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    
    // Submit empty form
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    
    // Check for validation errors
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    
    // Fill form
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    
    // Submit
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    
    // Verify submission
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })
})
```

### 6. Testing Custom Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter())

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })
})

describe('useAsync', () => {
  it('should handle async operations', async () => {
    const asyncFn = vi.fn().mockResolvedValue({ data: 'test' })
    const { result } = renderHook(() => useAsync(asyncFn))

    // Initial state
    expect(result.current.status).toBe('idle')

    // Execute
    act(() => {
      result.current.execute()
    })

    // Loading state
    expect(result.current.status).toBe('loading')

    // Success state
    await waitFor(() => {
      expect(result.current.status).toBe('success')
      expect(result.current.data).toEqual({ data: 'test' })
    })
  })
})
```

### 7. Testing Server Actions

```typescript
// Testing Server Actions requires a different approach
import { createProject } from '@/lib/actions/projects'

describe('createProject', () => {
  it('should create a project with valid data', async () => {
    const formData = new FormData()
    formData.set('name', 'Test Project')
    formData.set('description', 'A test project')

    const result = await createProject({}, formData)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      name: 'Test Project',
    })
  })

  it('should return validation errors for invalid data', async () => {
    const formData = new FormData()
    formData.set('name', '') // Empty name

    const result = await createProject({}, formData)

    expect(result.success).toBe(false)
    expect(result.error?.fields?.name).toBeDefined()
  })
})
```

---

## 📁 File Structure

```
__tests__/
├── setup.ts               # Test setup (MSW, globals)
├── mocks/
│   ├── handlers.ts        # MSW handlers
│   └── server.ts          # MSW server setup
└── utils/
    └── test-utils.tsx     # Custom render, providers

app/
└── [feature]/
    └── __tests__/         # Co-located tests
        └── page.test.tsx

components/
└── ui/
    └── button.test.tsx    # Co-located with component

lib/
└── utils/
    └── format.test.ts     # Co-located with utility
```

### Test Setup

```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from './mocks/server'

// Start MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
```

### Custom Render

```typescript
// __tests__/utils/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Add providers here (theme, auth, etc.)
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
```

---

## ⚙️ Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
})
```

---

## 📋 Testing Checklist

- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Using role-based queries (getByRole, findByRole)
- [ ] Using userEvent instead of fireEvent
- [ ] No arbitrary timeouts or sleep
- [ ] External APIs mocked with MSW
- [ ] Testing behavior, not implementation
- [ ] Error states tested
- [ ] Loading states tested
- [ ] Form validation tested
- [ ] Test coverage > 80% on critical paths

---

*Skill Version: 2.0.0 | Compatible with Vitest 2.x & React Testing Library*
