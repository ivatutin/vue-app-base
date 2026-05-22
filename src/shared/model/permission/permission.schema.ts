import { z } from 'zod'

export const permissionSchema = z.enum([
  'user.read',
  'user.update',
  'user.delete',
  'role.manage',
])

export type PermissionCode = z.infer<typeof permissionSchema>
