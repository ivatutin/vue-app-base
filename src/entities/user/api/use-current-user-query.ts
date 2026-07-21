import type { MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCurrentUser } from './get-current-user'

export interface CurrentUserQueryOptions {
  /**
   * Условие запуска запроса. Передаётся снаружи, а не читается из
   * `entities/auth`: слайсу нельзя знать про соседний слайс того же
   * слоя (CONTRIBUTING § Правила импортов). Оркестрация «есть ли
   * сессия» — забота вызывающего кода.
   */
  enabled?: MaybeRefOrGetter<boolean>
}

/**
 * Кэшированный профиль текущего пользователя (`GET /users/me`)
 * через TanStack Query ([ADR-0008](../../../../docs/adr/0008-tanstack-query-for-server-state.md)).
 *
 * Существует параллельно `useUserStore`: стор остаётся источником для
 * RBAC (`hasPermission`, `roles`) и cross-entity сброса в `logoutFlow`,
 * а этот composable — для read-сценариев с кэшем и фоновым обновлением.
 *
 * **Двойственность осознанная, но временная** — мост между Pinia и
 * Query из ADR-0008 пока не построен, поэтому два источника профиля
 * могут разойтись после фонового refetch. Пока у composable нет
 * потребителей; перед первым использованием реши, кто из двух
 * источник истины для конкретного экрана.
 *
 * Детали:
 * - QueryKey — стабильный массив `['users', 'me']`. Чистить кэш при
 *   выходе потребителю НЕ нужно: `logoutFlow` (и `loginFlow`) делают
 *   `queryClient.clear()` централизованно, иначе данные предыдущего
 *   пользователя переживали бы смену аккаунта.
 * - `staleTime` берётся из глобальных defaults (30 c, `setup-query-client`).
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useCurrentUserQuery } from '@/entities/user'
 *
 * const { data: user, isPending, error } = useCurrentUserQuery()
 * </script>
 * ```
 *
 * @example Запрос только при активной сессии
 * ```ts
 * const auth = useAuthStore()
 * const { data } = useCurrentUserQuery({
 *   enabled: () => auth.isSessionActive,
 * })
 * ```
 */
export function useCurrentUserQuery (options: CurrentUserQueryOptions = {}) {
  return useQuery({
    queryKey: ['users', 'me'] as const,
    queryFn: getCurrentUser,
    enabled: options.enabled ?? true,
  })
}
