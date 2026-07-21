import type { QueryClient } from '@tanstack/vue-query'

/**
 * Доступ к QueryClient вне компонентного контекста.
 *
 * `useQueryClient()` работает только внутри setup — а чистить кэш нужно
 * из `logoutFlow`, который зовётся в том числе из `onUnauthorized`
 * HTTP-клиента, где никакого компонента нет.
 *
 * Паттерн тот же, что у `getHttpClient` ([instance.ts](./instance.ts)):
 * инстанс собирается в провайдере, наружу отдаётся через getter.
 */
let instance: QueryClient | null = null

export function setQueryClient (client: QueryClient): void {
  instance = client
}

export function getQueryClient (): QueryClient {
  if (!instance) {
    throw new Error('QueryClient not initialized. Call setupQueryClient(app) first.')
  }
  return instance
}

/**
 * Мягкий вариант: не бросает, если провайдер не поднят.
 *
 * Нужен для `logoutFlow` — logout обязан отработать и в тестах, и в
 * окружениях без Query-провайдера. Невозможность почистить кэш не
 * должна мешать выходу из аккаунта.
 */
export function peekQueryClient (): QueryClient | null {
  return instance
}
