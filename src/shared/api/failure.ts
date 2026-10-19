import { HttpError } from './http-error'

/**
 * Причина отказа запроса — то, что определяет РЕАКЦИЮ приложения,
 * а не HTTP-код сам по себе.
 *
 * Ключевое разделение: retryable-инфраструктура (`offline`/`network`/
 * `timeout`/`server`) против невосстановимых ошибок (`contract`/`unknown`).
 * Предлагать «Повторить» там, где повтор бесполезен, — врать пользователю.
 *
 * `auth` стоит особняком: это не отказ, а «сессии больше нет» — нормальный
 * путь, который должен вести на login, а не на экран ошибки.
 *
 * `forbidden` — тоже не «сессия»: сервер знает пользователя, но роли не хватает
 * (`403 Forbidden`, контракт v1.5). Ведём себя как с прикладным отказом: показываем
 * «нет прав», сессию не трогаем и на login не отправляем.
 */
export type FailureKind
  = | 'offline'
    | 'network'
    | 'timeout'
    | 'server'
    | 'auth'
    | 'forbidden'
    | 'contract'
    | 'unknown'

const RETRYABLE: ReadonlySet<FailureKind> = new Set<FailureKind>([
  'offline',
  'network',
  'timeout',
  'server',
])

/**
 * ZodError определяем по имени, а не через `instanceof`: так `shared/api`
 * не начинает зависеть от zod ради одной проверки.
 */
function isZodError (e: unknown): boolean {
  return e instanceof Error && e.name === 'ZodError'
}

export function classifyFailure (e: unknown): FailureKind {
  if (isZodError(e)) {
    return 'contract'
  }

  if (e instanceof HttpError) {
    // status 0 — транспорт не состоялся, HTTP-ответа не было вовсе.
    if (e.status === 0) {
      if (e.errorName === 'TimeoutError') {
        return 'timeout'
      }
      // navigator.onLine — надёжен только в отрицании: false почти
      // наверняка значит «сети нет», true не гарантирует ничего.
      return isOffline() ? 'offline' : 'network'
    }

    if (e.status === 401) {
      return 'auth'
    }

    // 403 — нехватка роли, а не истёкшая сессия: RolesGuard отвечает
    // `{"error":"Forbidden"}` (контракт v1.5). Раньше 403 уходил в `auth`
    // и отказ RBAC выглядел как «войдите заново».
    if (e.status === 403) {
      return 'forbidden'
    }

    if (e.status >= 500) {
      return 'server'
    }
  }

  return 'unknown'
}

export function isRetryableFailure (kind: FailureKind): boolean {
  return RETRYABLE.has(kind)
}

export function isOffline (): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * Тексты для пользователя. Намеренно без технических деталей —
 * их место в `<details>` на экране ошибки и в консоли.
 */
export const FAILURE_MESSAGES: Record<FailureKind, string> = {
  offline: 'Нет подключения к интернету',
  network: 'Не удалось связаться с сервером',
  timeout: 'Сервер не ответил вовремя',
  server: 'Сервис временно недоступен',
  auth: 'Сессия истекла — войдите заново',
  forbidden: 'Недостаточно прав для этого действия',
  contract: 'Приложение получило неожиданный ответ сервера',
  unknown: 'Непредвиденная ошибка',
}

export function getFailureMessage (e: unknown): string {
  return FAILURE_MESSAGES[classifyFailure(e)]
}
