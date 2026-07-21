import { classifyFailure, type FailureKind, getFailureMessage, isRetryableFailure } from '@/shared/api'

export interface BootstrapError {
  /** Текст для пользователя — без технических деталей. */
  message: string
  code?: string
  /** Причина отказа; определяет и текст, и наличие кнопки «Повторить». */
  kind: FailureKind
  /**
   * Инфраструктурный сбой (сеть/таймаут/5xx) против невосстановимого
   * (сломанный контракт, баг). Повтор предлагаем только в первом случае.
   */
  retryable: boolean
  /** Исходная ошибка — для `<details>` и логов, не для основного текста. */
  technical?: string
}

export type BootstrapStatus
  = | 'idle'
    | 'initializing'
    | 'ready'
    | 'failed'

export const useBootstrapStore = defineStore('bootstrap', () => {
  // state
  const status = ref<BootstrapStatus>('idle')
  const error = ref<BootstrapError | null>(null)

  // getters
  const isIdle = computed(() => status.value === 'idle')
  const isInitializing = computed(() => status.value === 'initializing')
  const isReady = computed(() => status.value === 'ready')
  const isFailed = computed(() => status.value === 'failed')
  const hasError = computed(() => error.value !== null)

  // actions
  function start (): void {
    status.value = 'initializing'
    error.value = null
  }

  function finish (): void {
    status.value = 'ready'
    error.value = null
  }

  function fail (e: unknown): void {
    status.value = 'failed'
    error.value = normalizeError(e)
  }

  function reset (): void {
    status.value = 'idle'
    error.value = null
  }

  return {
    // state
    status,
    error,

    // getters
    isIdle,
    isInitializing,
    isReady,
    isFailed,
    hasError,

    // actions
    start,
    finish,
    fail,
    reset,
  }
})

function normalizeError (e: unknown): BootstrapError {
  const kind = classifyFailure(e)

  return {
    message: getFailureMessage(e),
    kind,
    retryable: isRetryableFailure(kind),
    technical: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
  }
}
