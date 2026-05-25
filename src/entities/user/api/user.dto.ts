import { z } from 'zod'

export const userStatusDtoSchema = z.enum([
  'pending_verification',
  'active',
  'suspended',
  'deleted',
])

export const userDtoSchema = z.object({
  id: z.uuid(),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  roles: z.array(z.string()).default([]),
  status: userStatusDtoSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserDto = z.infer<typeof userDtoSchema>
