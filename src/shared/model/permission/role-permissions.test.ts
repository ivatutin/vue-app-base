import { describe, expect, it } from 'vitest'
import { ROLE_PERMISSIONS, rolesToPermissions } from './role-permissions'

describe('rolesToPermissions', () => {
  it('admin → все permissions', () => {
    const adminPerms = ROLE_PERMISSIONS['admin'] ?? []
    const perms = rolesToPermissions(['admin'])
    expect(perms).toEqual(expect.arrayContaining([...adminPerms]))
    expect(perms).toHaveLength(adminPerms.length)
  })

  it('user → только user.read', () => {
    expect(rolesToPermissions(['user'])).toEqual(['user.read'])
  })

  it('manager + user → дедупликация (user.read не дублируется)', () => {
    const perms = rolesToPermissions(['manager', 'user'])
    expect(perms).toEqual(expect.arrayContaining(['user.read', 'user.update']))
    expect(perms.filter(p => p === 'user.read')).toHaveLength(1)
  })

  it('неизвестная роль молча игнорируется', () => {
    expect(rolesToPermissions(['ghost'])).toEqual([])
    expect(rolesToPermissions(['ghost', 'user'])).toEqual(['user.read'])
  })

  it('пустой массив ролей → пустой массив permissions', () => {
    expect(rolesToPermissions([])).toEqual([])
  })

  it('keycloak-системные роли игнорируются (offline_access, uma_authorization, default-roles-app)', () => {
    // Эти роли реально приходят от Keycloak — наш mapping их не знает,
    // permissions должны быть пустые. См. docs/integration-backend.md.
    expect(
      rolesToPermissions(['offline_access', 'uma_authorization', 'default-roles-app']),
    ).toEqual([])
  })
})
