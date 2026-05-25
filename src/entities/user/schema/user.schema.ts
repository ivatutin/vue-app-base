import { z } from 'zod'
import { phoneSchema } from '@/shared/model/phone'

export const userStatusSchema = z.enum([
  'pending_verification',
  'active',
  'suspended',
  'deleted',
])

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().nullable(),
  phone: phoneSchema.nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  roles: z.array(z.string()).default([]),
  status: userStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type User = z.infer<typeof userSchema>
export type UserStatus = z.infer<typeof userStatusSchema>
