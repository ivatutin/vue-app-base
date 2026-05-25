import type { PermissionCode } from '@/shared/model/permission'
import { useUserStore } from '@/entities/user'

export function can (permission: PermissionCode): boolean {
  return useUserStore().hasPermission(permission)
}
