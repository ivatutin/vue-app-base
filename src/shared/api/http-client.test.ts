import { afterEach, describe, expect, it, vi } from 'vitest'
import { classifyFailure } from './failure'
import { HttpClient } from './http-client'
import { HttpError } from './http-error'

function jsonResponse (body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function createClient (timeoutMs?: number): HttpClient {
  return new HttpClient({
    baseUrl: 'https://api.example.test/v1',
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  })
}

describe('HttpClient — транспортные ошибки', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('успешный JSON-ответ проходит насквозь', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ id: 1 })))

    await expect(createClient().get('/users/me')).resolves.toEqual({ id: 1 })
  })

  it('reject fetch превращается в HttpError, а не утекает как TypeError', async () => {
    // Именно из-за сырого TypeError раньше рвались все проверки
    // `instanceof HttpError` вверх по стеку, а в UI попадало
    // англоязычное «Failed to fetch».
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await createClient().get('/users/me').catch((error_: unknown) => error_)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(0)
    expect((error as HttpError).errorName).toBe('NetworkError')
    expect((error as HttpError).cause).toBeInstanceOf(TypeError)
  })

  it('таймаут классифицируется как timeout, а не как сеть', async () => {
    const timeoutError = new Error('The operation timed out')
    timeoutError.name = 'TimeoutError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError))

    const error = await createClient().get('/users/me').catch((error_: unknown) => error_)

    expect(error).toBeInstanceOf(HttpError)
    expect(classifyFailure(error)).toBe('timeout')
  })

  it('передаёт сигнал таймаута в fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await createClient(5000).get('/users/me')

    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('timeoutMs: 0 отключает таймаут', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await createClient(0).get('/users/me')

    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(init.signal).toBeUndefined()
  })

  it('отмену вызывающим кодом не подменяет сетевой ошибкой', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      controller.abort()
      return Promise.reject(abortError)
    }))

    const error = await createClient()
      .get('/users/me', { signal: controller.signal })
      .catch((error_: unknown) => error_)

    // Caller должен уметь отличить «я сам отменил» от «сеть упала».
    expect(error).toBe(abortError)
    expect(error).not.toBeInstanceOf(HttpError)
  })

  it('HTTP-ошибка с телом по-прежнему даёт HttpError со статусом', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: 'ServiceUnavailable', message: 'db is down' }, 503),
    ))

    const error = await createClient().get('/users/me').catch((error_: unknown) => error_)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(503)
    expect(classifyFailure(error)).toBe('server')
  })
})
