import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { hasSuperAdminRole } from '@/lib/auth/is-super-admin'

type TestUser = {
  id: string
  email: string
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
}

const state: { user: TestUser | null } = { user: null }

const createServiceClientMock = vi.fn()
const businessesOrderMock = vi.fn()

const supabaseStub = {
  auth: {
    getUser: async () => ({ data: { user: state.user } }),
    signInWithPassword: async () => ({ data: { user: state.user }, error: null }),
  },
  from: () => ({
    select: () => ({ order: businessesOrderMock }),
  }),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => supabaseStub,
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => supabaseStub,
  createServiceClient: (...args: unknown[]) => createServiceClientMock(...args),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => undefined }),
}))

vi.mock('@/lib/email', () => ({ sendPasswordResetEmailViaResend: vi.fn() }))

vi.mock('@/app/super-admin/super-admin-panel', () => ({
  SuperAdminPanel: () => null,
}))

function makeUser(overrides: Partial<TestUser>): TestUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    user_metadata: {},
    app_metadata: {},
    ...overrides,
  }
}

// What an attacker can do with the anon key: supabase.auth.updateUser({ data: { is_super_admin: true } })
const SPOOFED_USER = makeUser({ user_metadata: { is_super_admin: true } })
const REAL_SUPER_ADMIN = makeUser({ app_metadata: { is_super_admin: true } })
const NORMAL_USER = makeUser({})

beforeEach(() => {
  state.user = null
  createServiceClientMock.mockReset()
  businessesOrderMock.mockReset()
  businessesOrderMock.mockResolvedValue({ data: [], error: null })
})

describe('hasSuperAdminRole', () => {
  it('ignores user_metadata', () => {
    expect(hasSuperAdminRole(SPOOFED_USER)).toBe(false)
  })

  it('accepts app_metadata.is_super_admin === true', () => {
    expect(hasSuperAdminRole(REAL_SUPER_ADMIN)).toBe(true)
  })

  it('rejects null, undefined and non-true values', () => {
    expect(hasSuperAdminRole(null)).toBe(false)
    expect(hasSuperAdminRole(undefined)).toBe(false)
    expect(hasSuperAdminRole(makeUser({ app_metadata: { is_super_admin: 'true' } }))).toBe(false)
    expect(hasSuperAdminRole(makeUser({ app_metadata: { is_super_admin: false } }))).toBe(false)
  })
})

describe('proxy', () => {
  async function run(pathname: string): Promise<string | null> {
    const { proxy } = await import('@/proxy')
    const response = await proxy(new NextRequest(`http://localhost:3000${pathname}`))
    return response.headers.get('location')
  }

  it('redirects spoofed user_metadata user away from /super-admin', async () => {
    state.user = SPOOFED_USER
    expect(await run('/super-admin')).toBe('http://localhost:3000/dashboard')
  })

  it('treats spoofed user_metadata user as normal on /login', async () => {
    state.user = SPOOFED_USER
    expect(await run('/login')).toBe('http://localhost:3000/dashboard')
  })

  it('lets app_metadata super admin into /super-admin', async () => {
    state.user = REAL_SUPER_ADMIN
    expect(await run('/super-admin')).toBeNull()
  })

  it('sends app_metadata super admin from /login to /super-admin', async () => {
    state.user = REAL_SUPER_ADMIN
    expect(await run('/login')).toBe('http://localhost:3000/super-admin')
  })
})

describe('/super-admin page', () => {
  it('redirects spoofed user_metadata user to /dashboard', async () => {
    state.user = SPOOFED_USER
    const { default: SuperAdminPage } = await import('@/app/super-admin/page')
    await expect(SuperAdminPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard')
  })

  it('renders for app_metadata super admin', async () => {
    state.user = REAL_SUPER_ADMIN
    const { default: SuperAdminPage } = await import('@/app/super-admin/page')
    await expect(SuperAdminPage()).resolves.toBeDefined()
  })
})

describe('super-admin actions (assertSuperAdmin)', () => {
  const input = { email: 'not-an-email', password: 'short', businessName: '', slug: '' }

  it('rejects spoofed user_metadata user and never builds a service client', async () => {
    state.user = SPOOFED_USER
    const { createBusinessAccount, getSuperAdminBusinessDetails } = await import('@/app/actions/super-admin')

    expect(await createBusinessAccount(input)).toEqual({ success: false, error: 'No autorizado' })
    expect(await getSuperAdminBusinessDetails('biz-1')).toEqual({ success: false, error: 'No autorizado' })
    expect(createServiceClientMock).not.toHaveBeenCalled()
  })

  it('rejects normal user', async () => {
    state.user = NORMAL_USER
    const { createBusinessAccount } = await import('@/app/actions/super-admin')
    expect(await createBusinessAccount(input)).toEqual({ success: false, error: 'No autorizado' })
  })

  it('lets app_metadata super admin past the authorization check', async () => {
    state.user = REAL_SUPER_ADMIN
    const { createBusinessAccount } = await import('@/app/actions/super-admin')
    const result = await createBusinessAccount(input)
    // Reaches input validation, i.e. passed assertSuperAdmin
    expect(result.success).toBe(false)
    expect(result).not.toEqual({ success: false, error: 'No autorizado' })
  })
})

describe('auth actions', () => {
  it('isSuperAdmin() is false for spoofed user_metadata, true for app_metadata', async () => {
    const { isSuperAdmin } = await import('@/app/actions/auth')
    state.user = SPOOFED_USER
    expect(await isSuperAdmin()).toBe(false)
    state.user = REAL_SUPER_ADMIN
    expect(await isSuperAdmin()).toBe(true)
  })

  it('getAllBusinesses() rejects spoofed user_metadata user, allows app_metadata super admin', async () => {
    const { getAllBusinesses } = await import('@/app/actions/auth')
    state.user = SPOOFED_USER
    expect(await getAllBusinesses()).toEqual({ success: false, error: 'No autorizado' })
    expect(businessesOrderMock).not.toHaveBeenCalled()

    state.user = REAL_SUPER_ADMIN
    expect(await getAllBusinesses()).toEqual({ success: true, data: [] })
  })

  it('login() redirects by app_metadata only', async () => {
    const { login } = await import('@/app/actions/auth')
    const form = new FormData()
    form.set('email', 'user@example.com')
    form.set('password', 'password123')

    state.user = SPOOFED_USER
    await expect(login(form)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    state.user = REAL_SUPER_ADMIN
    await expect(login(form)).rejects.toThrow('NEXT_REDIRECT:/super-admin')
  })
})
