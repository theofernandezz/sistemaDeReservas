import { z } from 'zod'

export const passwordResetRequestSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
})

export const passwordUpdateSchema = z.object({
  password: z.string().min(6).max(72).trim(),
})
