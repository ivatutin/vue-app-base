export interface BootstrapError {
  message: string
  code?: string
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
  if (e instanceof Error) {
    return { message: e.message }
  }

  return { message: 'Unknown bootstrap error' }
}
