import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/entities/auth'
import { getCurrentUser } from './get-current-user'

/**
 * Pilot composable для TanStack Query (ROADMAP Фаза 2 — partial done).
 *
 * Возвращает кэшированный профиль текущего пользователя через
 * `GET /users/me`. Параллельно существующему `useUserStore` —
 * последний остаётся для RBAC (`hasPermission`, `roles`) и
 * cross-entity reset через `logoutFlow`. TanStack Query — для
 * read-сценариев с кэшем/refresh (профиль на dashboard, аватарка
 * в header, и т.п.).
 *
 * Логика:
 * - Запрос выполняется только если есть валидная сессия
 *   (`auth.isSessionActive`), иначе query disabled — `data` = undefined,
 *   network call не идёт.
 * - QueryKey — стабильный массив `['users', 'me']`. При logout
 *   потребитель должен вызвать `queryClient.removeQueries({ queryKey:
 *   ['users', 'me'] })` через свой `useQueryClient()`.
 * - staleTime берётся из глобальных defaults (30s в setup-query-client).
 *
 * Использование:
 * ```vue
 * <script setup>
 * import { useCurrentUserQuery } from '@/entities/user/api/use-current-user-query'
 * const { data: user, isPending, error } = useCurrentUserQuery()
 * </script>
 * ```
 */
export function useCurrentUserQuery () {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['users', 'me'] as const,
    queryFn: getCurrentUser,
    enabled: computed(() => auth.isSessionActive),
  })
}
