import type { App } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { setQueryClient } from '@/shared/api'

/**
 * TanStack Query provider (pilot, ROADMAP Фаза 2 — partial done).
 *
 * Цель — серверный state с дедупликацией, кэшем, фоновым refresh и
 * инвалидацией. Параллельно существующим Pinia-сторам:
 * - Pinia остаётся для **клиентского** state (auth tokens, user
 *   profile для RBAC, notification queue, bootstrap FSM).
 * - TanStack Query — для query-данных, которые умеют устаревать и
 *   фоново обновляться (списки, профили из API, dashboard-метрики).
 *
 * Дефолты: staleTime 30s — данные считаются свежими и не
 * перезапрашиваются. refetchOnWindowFocus отключён (мы B2B, не лента
 * соцсети). Конкретные queries могут переопределить per-call.
 */
export function setupQueryClient (app: App): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })

  app.use(VueQueryPlugin, { queryClient })
  // Чтобы `logoutFlow` мог почистить кэш вне компонентного контекста.
  setQueryClient(queryClient)

  return queryClient
}
