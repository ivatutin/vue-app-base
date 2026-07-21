import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { classifyFailure, getFailureMessage, isRetryableFailure } from './failure'
import { HttpError } from './http-error'

function setOnline (value: boolean): void {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

describe('classifyFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('транспортный отказ при живой сети → network', () => {
    setOnline(true)
    expect(classifyFailure(HttpError.network(new TypeError('Failed to fetch')))).toBe('network')
  })

  it('транспортный отказ без сети → offline', () => {
    setOnline(false)
    expect(classifyFailure(HttpError.network())).toBe('offline')
  })

  it('таймаут распознаётся отдельно от сети', () => {
    setOnline(false)
    // Даже при onLine === false таймаут остаётся таймаутом:
    // проверка errorName идёт раньше.
    expect(classifyFailure(HttpError.timeout(30_000))).toBe('timeout')
  })

  it('401 и 403 → auth (не отказ приложения, а истёкшая сессия)', () => {
    expect(classifyFailure(new HttpError(401, 'Unauthorized', 'E', 'x'))).toBe('auth')
    expect(classifyFailure(new HttpError(403, 'Forbidden', 'E', 'x'))).toBe('auth')
  })

  it('5xx → server', () => {
    expect(classifyFailure(new HttpError(500, 'Internal', 'E', 'x'))).toBe('server')
    expect(classifyFailure(new HttpError(503, 'Unavailable', 'E', 'x'))).toBe('server')
  })

  it('ZodError → contract', () => {
    const result = z.object({ a: z.string() }).safeParse({ a: 1 })
    expect(result.success).toBe(false)
    expect(classifyFailure(result.error)).toBe('contract')
  })

  it('прочие 4xx и произвольные ошибки → unknown', () => {
    expect(classifyFailure(new HttpError(418, 'Teapot', 'E', 'x'))).toBe('unknown')
    expect(classifyFailure(new Error('boom'))).toBe('unknown')
    expect(classifyFailure('строка')).toBe('unknown')
  })
})

describe('isRetryableFailure', () => {
  it('инфраструктурные отказы retryable', () => {
    for (const kind of ['offline', 'network', 'timeout', 'server'] as const) {
      expect(isRetryableFailure(kind)).toBe(true)
    }
  })

  it('contract, auth и unknown не retryable — повтор бесполезен', () => {
    for (const kind of ['contract', 'auth', 'unknown'] as const) {
      expect(isRetryableFailure(kind)).toBe(false)
    }
  })
})

describe('getFailureMessage', () => {
  it('не отдаёт технический текст ошибки наружу', () => {
    const message = getFailureMessage(HttpError.network(new TypeError('Failed to fetch')))
    expect(message).not.toContain('Failed to fetch')
    expect(message).toBe('Не удалось связаться с сервером')
  })
})
