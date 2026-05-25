export type NotificationKind = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  kind: NotificationKind
  message: string
  timeout: number
}

export interface NotifyInput {
  kind?: NotificationKind
  message: string
  timeout?: number
}

const DEFAULT_TIMEOUT_BY_KIND: Record<NotificationKind, number> = {
  info: 4000,
  success: 4000,
  warning: 6000,
  error: 0,
}

export const useNotificationStore = defineStore('notification', () => {
  const items = ref<Notification[]>([])

  function push (input: NotifyInput): string {
    const kind = input.kind ?? 'info'
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `n_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const item: Notification = {
      id,
      kind,
      message: input.message,
      timeout: input.timeout ?? DEFAULT_TIMEOUT_BY_KIND[kind],
    }
    items.value = [...items.value, item]
    return id
  }

  function notifyError (message: string): string {
    return push({ kind: 'error', message })
  }

  function dismiss (id: string): void {
    items.value = items.value.filter(n => n.id !== id)
  }

  function clear (): void {
    items.value = []
  }

  return {
    items,
    push,
    notifyError,
    dismiss,
    clear,
  }
})
