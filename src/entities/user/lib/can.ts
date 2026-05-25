import type { PermissionCode } from '@/shared/model/permission'

/**
 * TODO (фаза 1.10): вернуть проверку через userStore.hasPermission()
 * после внедрения roles→permissions mapping. Сейчас — true-stub:
 * sidebar показывает все пункты, guard ещё не проверяет meta.permissions.
 */
export function can(_permission: PermissionCode): boolean {
  return true
}
