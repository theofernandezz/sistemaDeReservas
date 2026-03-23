import { describe, expect, it } from 'vitest'

import { dbServiceToFrontend, frontendServiceToDB } from '@/lib/adapters'
import { createServiceSchema, updateServiceSchema } from '@/lib/schemas'
import type { Service } from '@/types/database.types'

describe('services image regression', () => {
  it('keeps image and description in update service validation', () => {
    const payload = {
      name: 'Corte Premium',
      duration_minutes: 60,
      price: 25000,
      description: 'Con lavado y peinado',
      image: 'https://cdn.example.com/services/corte-premium.jpg',
      is_active: true,
    }

    const result = updateServiceSchema.safeParse(payload)

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected updateServiceSchema to accept image and description')
    }

    expect(result.data.description).toBe(payload.description)
    expect(result.data.image).toBe(payload.image)
  })

  it('keeps image and description in create service validation', () => {
    const payload = {
      name: 'Color Completo',
      duration_minutes: 90,
      price: 45000,
      description: 'Incluye diagnóstico capilar',
      image: 'https://cdn.example.com/services/color-completo.jpg',
      is_active: true,
    }

    const result = createServiceSchema.safeParse(payload)

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected createServiceSchema to accept image and description')
    }

    expect(result.data.description).toBe(payload.description)
    expect(result.data.image).toBe(payload.image)
  })

  it('maps image fields between frontend and database adapters', () => {
    const dbInput = frontendServiceToDB({
      title: 'Manicura',
      durationMin: 45,
      price: 18000,
      description: 'Esmaltado semipermanente',
      image: 'https://cdn.example.com/services/manicura.jpg',
      active: true,
    })

    expect(dbInput.description).toBe('Esmaltado semipermanente')
    expect(dbInput.image).toBe('https://cdn.example.com/services/manicura.jpg')

    const serviceFromDb: Service = {
      id: '8e1e3cb8-5fd2-494d-8d8c-6ffdb4eb1dd8',
      name: 'Manicura',
      duration_minutes: 45,
      price: 18000,
      display_order: 1,
      is_active: true,
      created_at: '2026-03-23T10:00:00.000Z',
      description: 'Esmaltado semipermanente',
      image: 'https://cdn.example.com/services/manicura.jpg',
      business_id: '4fa001c8-c2b9-4f65-b58f-2571f41fe7a2',
    }

    const frontendService = dbServiceToFrontend(serviceFromDb)

    expect(frontendService.description).toBe('Esmaltado semipermanente')
    expect(frontendService.image).toBe('https://cdn.example.com/services/manicura.jpg')
  })
})
