import type { GuardContext } from './resolve-guard'
import type { PermissionCode } from '@/shared/model/permission'
import { describe, expect, it } from 'vitest'
import { resolveGuard } from './resolve-guard'

function context (overrides: Partial<GuardContext> = {}): GuardContext {
  return {
    requiresAuth: true,
    isAuthenticated: true,
    isAuthorized: true,
    requiredPermissions: [],
    hasPermission: () => true,
    ...overrides,
  }
}

describe('resolveGuard', () => {
  it('пропускает активного пользователя', () => {
    expect(resolveGuard(context())).toBeUndefined()
  })

  it('пропускает кого угодно на публичный маршрут', () => {
    const target = resolveGuard(context({
      requiresAuth: false,
      isAuthenticated: false,
      isAuthorized: false,
    }))
    expect(target).toBeUndefined()
  })

  it('неаутентифицированного отправляет на login', () => {
    const target = resolveGuard(context({ isAuthenticated: false, isAuthorized: false }))
    expect(target).toBe('/auth/login')
  })

  /**
   * Регрессия: раньше «не аутентифицирован» и «не допущен» сливались
   * в один редирект на login. Пользователь со статусом
   * pending_verification успешно входил, guard возвращал его на форму,
   * форма принимала те же данные — бесконечный цикл без объяснения.
   */
  describe('аутентифицирован, но не допущен', () => {
    const suspended = context({ isAuthenticated: true, isAuthorized: false })

    it('НЕ отправляется на login — там он уже был успешно', () => {
      expect(resolveGuard(suspended)).not.toBe('/auth/login')
    })

    it('ведётся на страницу статуса аккаунта', () => {
      expect(resolveGuard(suspended)).toBe('/system/account-status')
    })

    it('статус проверяется раньше прав: причина отказа должна быть точной', () => {
      const target = resolveGuard(context({
        isAuthenticated: true,
        isAuthorized: false,
        requiredPermissions: ['user.read'] as PermissionCode[],
        hasPermission: () => false,
      }))
      // Не /system/forbidden: дело не в правах, а в статусе аккаунта.
      expect(target).toBe('/system/account-status')
    })

    it('на публичный маршрут пускается — иначе не выйти из аккаунта', () => {
      const target = resolveGuard(context({
        requiresAuth: false,
        isAuthenticated: true,
        isAuthorized: false,
      }))
      expect(target).toBeUndefined()
    })
  })

  describe('проверка прав', () => {
    it('пропускает при наличии всех требуемых прав', () => {
      const target = resolveGuard(context({
        requiredPermissions: ['user.read', 'user.update'] as PermissionCode[],
        hasPermission: () => true,
      }))
      expect(target).toBeUndefined()
    })

    it('ведёт на forbidden, если не хватает хотя бы одного', () => {
      const granted = new Set<string>(['user.read'])
      const target = resolveGuard(context({
        requiredPermissions: ['user.read', 'user.update'] as PermissionCode[],
        hasPermission: p => granted.has(p),
      }))
      expect(target).toBe('/system/forbidden')
    })

    it('пустой список прав ничего не требует', () => {
      const target = resolveGuard(context({
        requiredPermissions: [],
        hasPermission: () => false,
      }))
      expect(target).toBeUndefined()
    })
  })
})
