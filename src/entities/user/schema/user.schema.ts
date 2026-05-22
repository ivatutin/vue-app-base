import { z } from 'zod'
import { phoneSchema } from '@/shared/model/phone'
import { permissionSchema } from '@/shared/model/permission'

export const userSchema = z.object({
  id: z.uuid(),
  fullName: z.string().max(31).trim(),
  phone: phoneSchema,
  email: z.email(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(permissionSchema).default([]),
  isActive: z.boolean(),
  createdAt: z.date(),
})

export type User = z.infer<typeof userSchema>
