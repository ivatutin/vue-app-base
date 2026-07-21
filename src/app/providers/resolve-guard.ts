import type { PermissionCode } from '@/shared/model/permission'

/**
 * Маршруты, на которые guard умеет перенаправлять.
 * Литеральный union, чтобы опечатка ловилась компилятором.
 */
export type GuardTarget
  = | '/auth/login'
    | '/system/account-status'
    | '/system/forbidden'

export interface GuardContext {
  /** `false` для публичных маршрутов (`meta.noAuth`). */
  requiresAuth: boolean
  /** Профиль загружен. */
  isAuthenticated: boolean
  /** Профиль загружен И статус `active`. */
  isAuthorized: boolean
  requiredPermissions: readonly PermissionCode[]
  hasPermission: (permission: PermissionCode) => boolean
}

/**
 * Решение router-guard, вынесенное из `beforeEach` чистой функцией:
 * так его можно проверить тестами без поднятия роутера, а сам guard
 * остаётся тонкой обёрткой.
 *
 * Ключевое различие — между «не аутентифицирован» и «аутентифицирован,
 * но не допущен». Раньше их сливали в один редирект на login, и
 * пользователь со статусом `pending_verification` попадал в бесконечный
 * цикл: логин проходил успешно, guard возвращал его на форму, форма
 * снова принимала те же данные — и так без единого сообщения о причине.
 * После запуска регистрации этот статус станет основным у новых
 * пользователей, то есть цикл встречал бы каждого второго.
 */
export function resolveGuard (context: GuardContext): GuardTarget | undefined {
  if (!context.requiresAuth) {
    return undefined
  }

  if (!context.isAuthenticated) {
    return '/auth/login'
  }

  // Сессия рабочая, но пользователь не допущен — объясняем почему,
  // а не выкидываем на форму входа, которую он уже прошёл.
  if (!context.isAuthorized) {
    return '/system/account-status'
  }

  if (context.requiredPermissions.length > 0) {
    const allowed = context.requiredPermissions.every(p => context.hasPermission(p))
    if (!allowed) {
      return '/system/forbidden'
    }
  }

  return undefined
}
