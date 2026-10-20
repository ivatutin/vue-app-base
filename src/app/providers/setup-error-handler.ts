import type { App } from 'vue'
import { useNotificationStore } from '@/entities/notification'
import { getErrorMessage, HttpError } from '@/shared/api'

export function setupErrorHandler (app: App): void {
  app.config.errorHandler = (err, _instance, info) => {
    report(err, `vue:${info}`)
  }

  window.addEventListener('unhandledrejection', event => {
    report(event.reason, 'unhandledrejection')
  })

  window.addEventListener('error', event => {
    report(event.error ?? event.message, 'window:error')
  })
}

function report (err: unknown, source: string): void {
  console.error(`[${source}]`, err)
  try {
    useNotificationStore().notifyError(humanize(err))
  } catch {
    // Notification store ещё не доступен (Pinia не активен) —
    // глотаем; вывод в console.error уже сделан.
  }
}

export function humanize (err: unknown): string {
  // `HttpError.message` — это `message` из тела ответа, а там английский текст
  // (`Invalid credentials`, `Internal server error`). Пользователю — только реестр кодов
  // и generic-тексты; исходная строка остаётся в `console.error` для отладки.
  if (err instanceof HttpError) {
    return getErrorMessage(err)
  }
  if (typeof err === 'string' && err.length > 0 && !/^[A-Za-z]/.test(err)) {
    // Строки-исключения (не английские технические) иногда бросают вручную.
    return err
  }
  return 'Что-то пошло не так'
}
