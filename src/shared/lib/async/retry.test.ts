import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/api'
import { retry, retryOn404 } from './retry'

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('возвращает результат с первой попытки если task успешен', async () => {
    const task = vi.fn().mockResolvedValue('ok')
    const promise = retry(task, { attempts: 3, delay: 100 })
    await expect(promise).resolves.toBe('ok')
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('ретраит до attempts раз и пробрасывает последнюю ошибку', async () => {
    const err = new Error('boom')
    const task = vi.fn().mockRejectedValue(err)
    const promise = retry(task, { attempts: 3, delay: 100 })
    // .rejects подключаем ДО runAllTimersAsync, иначе rejection окажется
    // unhandled между микротасками и Vitest флагает файл.
    await Promise.all([expect(promise).rejects.toBe(err), vi.runAllTimersAsync()])
    expect(task).toHaveBeenCalledTimes(3)
  })

  it('возвращает значение если k-я попытка успешна', async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error('try1'))
      .mockRejectedValueOnce(new Error('try2'))
      .mockResolvedValue('finally')
    const promise = retry(task, { attempts: 5, delay: 100 })
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('finally')
    expect(task).toHaveBeenCalledTimes(3)
  })

  it('shouldRetry=false прекращает ретраи немедленно', async () => {
    const err = new Error('no-retry')
    const task = vi.fn().mockRejectedValue(err)
    const promise = retry(task, {
      attempts: 5,
      delay: 100,
      shouldRetry: () => false,
    })
    await expect(promise).rejects.toBe(err)
    expect(task).toHaveBeenCalledTimes(1)
  })
})

describe('retryOn404', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('ретраит на HttpError 404', async () => {
    const err404 = new HttpError(404, 'Not Found', 'EntityNotFoundError', 'User not found')
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(err404)
      .mockResolvedValue('done')
    const promise = retryOn404(task, { attempts: 3, delay: 100 })
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('done')
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('НЕ ретраит на HttpError с другим status', async () => {
    const err500 = new HttpError(500, 'Server Error', 'InternalServerError', 'Boom')
    const task = vi.fn().mockRejectedValue(err500)
    const promise = retryOn404(task, { attempts: 3, delay: 100 })
    await expect(promise).rejects.toBe(err500)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('НЕ ретраит на обычной Error (не HttpError)', async () => {
    const err = new Error('network')
    const task = vi.fn().mockRejectedValue(err)
    const promise = retryOn404(task, { attempts: 3, delay: 100 })
    await expect(promise).rejects.toBe(err)
    expect(task).toHaveBeenCalledTimes(1)
  })
})
