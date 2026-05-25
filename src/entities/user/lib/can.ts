import { useUserStore } from '@/entities/user'
import type { PermissionCode } from '@/shared/model/permission'

export function can(permission: PermissionCode): boolean {
  return useUserStore().hasPermission(permission)
}
