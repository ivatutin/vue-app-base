import { z } from 'zod'
import { permissionSchema } from '@/shared/model/permission'

export const userDtoSchema = z.object({
  id: z.uuid(),
  full_name: z.string().max(31).trim(),
  phone: z.string(),
  email: z.email(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(permissionSchema).default([]),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
})

export type UserDto = z.infer<typeof userDtoSchema>
