// entities/permission/lib/can.ts
import { useUserStore } from '@/entities/user'
import type { PermissionCode } from '../model/types'

export function can(permission: PermissionCode): boolean {
  const userStore = useUserStore()
  return userStore.hasPermission(permission)
}