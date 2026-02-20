import { z } from 'zod'
import { phoneSchema } from '@/shared/model/phone'

export const permissionSchema = z.enum([
  'user.read',
  'user.update',
  'user.delete',
  'role.manage'
])

export const userSchema = z.object({
  id: z.uuid(),
  full_name: z.string().max(31).trim(),
  phone: phoneSchema,
  email: z.email(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(permissionSchema).default([]),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
})

export type User = z.infer<typeof userSchema>
export type Permission = z.infer<typeof permissionSchema>