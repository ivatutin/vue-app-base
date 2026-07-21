import { HttpError } from '@/shared/api'

export interface RetryOptions {
  attempts: number
  delay: number
  shouldRetry?: (err: unknown) => boolean
}

export async function retry<T> (
  task: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < options.attempts; i++) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      const shouldRetry = options.shouldRetry?.(error) ?? true
      if (!shouldRetry || i === options.attempts - 1) {
        break
      }
      await sleep(options.delay)
    }
  }
  throw lastError
}

/**
 * Ретрай задачи только на HTTP 404 (другие ошибки пробрасывает сразу).
 * Под кейс `/users/me` после первого sign-in: local user создаётся
 * асинхронно через UserSignedInEvent (см. docs/integration-backend.md).
 */
export function retryOn404<T> (
  task: () => Promise<T>,
  options: { attempts: number, delay: number },
): Promise<T> {
  return retry(task, {
    ...options,
    shouldRetry: err => err instanceof HttpError && err.status === 404,
  })
}

export function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
