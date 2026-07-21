import type { Router } from 'vue-router'
import { useAuthStore } from '@/entities/auth'
import { useBootstrapStore } from '@/entities/bootstrap'
import { useUserStore } from '@/entities/user'
import { classifyFailure, isRetryableFailure } from '@/shared/api'
import { retryOn404, sleep } from '@/shared/lib/async'

interface BootstrapContext {
  router?: Router
}

/**
 * Тихие повторы до показа экрана ошибки. Переживают короткий сетевой
 * сбой (переключение wi-fi, секундный лаг мобильной сети) — пользователь
 * видит только прелоадер и о проблеме не узнаёт.
 */
const SILENT_RETRY_DELAYS_MS = [500, 2000]

interface Deferred {
  promise: Promise<void>
  resolve: () => void
  isSettled: boolean
}

function createDeferred (): Deferred {
  let resolve!: () => void
  const promise = new Promise<void>(r => {
    resolve = r
  })
  const deferred: Deferred = {
    promise,
    isSettled: false,
    resolve: () => {
      deferred.isSettled = true
      resolve()
    },
  }
  return deferred
}

let sessionRestored = createDeferred()

/**
 * Router-guard обязан дождаться восстановления сессии, иначе он примет
 * решение по пустому user-стору и уведёт залогиненного пользователя
 * на login (первая навигация стартует синхронно внутри `app.use(router)`,
 * то есть до запуска bootstrap).
 *
 * Разрешается ДО `router.isReady()` — иначе процесс и роутер ждут друг
 * друга: guard висит на этом промисе, а bootstrap висит на `isReady()`.
 */
export function whenSessionRestored (): Promise<void> {
  return sessionRestored.promise
}

/** Только для тестов: вернуть модуль в исходное состояние. */
export function _resetBootstrapForTests (): void {
  sessionRestored = createDeferred()
}

export async function runBootstrapProcess (context?: BootstrapContext): Promise<void> {
  const bootstrap = useBootstrapStore()
  const auth = useAuthStore()
  const user = useUserStore()

  bootstrap.start()

  try {
    auth.init()

    if (auth.isSessionActive) {
      await restoreSession(user)
    }
  } catch (error) {
    const kind = classifyFailure(error)

    // Протухшая сессия — не отказ приложения, а нормальный путь.
    // HTTP-клиент уже выполнил logoutFlow(), остаётся отдать управление
    // роутеру: guard уведёт на login. Экран ошибки здесь был бы враньём.
    if (kind !== 'auth') {
      bootstrap.fail(error)

      // Невосстановимую ошибку разблокируем — возврата всё равно нет,
      // а подвешенная навигация ничего не даёт. Retryable оставляем
      // заблокированной: успешный повтор должен перезапустить guard
      // уже с восстановленным состоянием, иначе пользователь окажется
      // на login при живой сессии.
      if (!isRetryableFailure(kind)) {
        sessionRestored.resolve()
      }
      return
    }
  }

  sessionRestored.resolve()

  if (context?.router) {
    await context.router.isReady()
  }

  bootstrap.finish()
}

async function restoreSession (user: ReturnType<typeof useUserStore>): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      // 404 сразу после первого sign-in — гонка с асинхронным созданием
      // local user на njs-server (UserSignedInEvent), к доступности API
      // отношения не имеет, поэтому обрабатывается отдельным ретраем.
      await retryOn404(() => user.fetchCurrentUser(), { attempts: 3, delay: 500 })
      return
    } catch (error) {
      const delay = SILENT_RETRY_DELAYS_MS[attempt]

      if (delay === undefined || !isRetryableFailure(classifyFailure(error))) {
        throw error
      }

      await sleep(delay)
    }
  }
}
