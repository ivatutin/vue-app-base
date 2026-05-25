import type { App } from 'vue'
import { HttpError } from '@/shared/api'
import { useNotificationStore } from '@/entities/notification'

export function setupErrorHandler(app: App): void {
  app.config.errorHandler = (err, _instance, info) => {
    report(err, `vue:${info}`)
  }

  window.addEventListener('unhandledrejection', (event) => {
    report(event.reason, 'unhandledrejection')
  })

  window.addEventListener('error', (event) => {
    report(event.error ?? event.message, 'window:error')
  })
}

function report(err: unknown, source: string): void {
  // eslint-disable-next-line no-console
  console.error(`[${source}]`, err)
  try {
    useNotificationStore().notifyError(humanize(err))
  } catch {
    // Notification store ещё не доступен (Pinia не активен) —
    // глотаем; вывод в console.error уже сделан.
  }
}

export function humanize(err: unknown): string {
  if (err instanceof HttpError) return err.message
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Что-то пошло не так'
}
