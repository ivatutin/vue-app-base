import type { PermissionCode } from './permission.schema'

/**
 * Маппинг ролей (от Keycloak / backend) в гранулярные permissions фронта.
 * Backend в `UserResponseDto.roles` отдаёт только строковые коды ролей;
 * permissions — frontend-абстракция (ADR-0004).
 *
 * При добавлении новой роли в Keycloak — добавляй её и сюда.
 * Неизвестные роли молча игнорируются (no permissions).
 */
export const ROLE_PERMISSIONS: Readonly<Record<string, readonly PermissionCode[]>> = {
  admin: ['user.read', 'user.update', 'user.delete', 'role.manage'],
  manager: ['user.read', 'user.update'],
  user: ['user.read'],
}

export function rolesToPermissions(roles: readonly string[]): PermissionCode[] {
  const set = new Set<PermissionCode>()
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role]
    if (perms) {
      for (const p of perms) set.add(p)
    }
  }
  return Array.from(set)
}
