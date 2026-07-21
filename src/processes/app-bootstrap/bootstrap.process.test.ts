import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { useAuthStore } from '@/entities/auth'
import { useBootstrapStore } from '@/entities/bootstrap'
import { useUserStore } from '@/entities/user'
import { HttpError } from '@/shared/api'
import { _resetBootstrapForTests, runBootstrapProcess, whenSessionRestored } from './bootstrap.process'

/** Разрешён ли промис — без ожидания, чтобы проверить «guard всё ещё заблокирован». */
async function isResolved (promise: Promise<unknown>): Promise<boolean> {
  const marker = Symbol('pending')
  const result = await Promise.race([promise, Promise.resolve(marker)])
  return result !== marker
}

function withSession (): ReturnType<typeof useAuthStore> {
  const auth = useAuthStore()
  vi.spyOn(auth, 'init').mockImplementation(() => {
    auth.accessToken = 'access-token'
    auth.refreshToken = 'refresh-token'
  })
  return auth
}

describe('runBootstrapProcess', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    _resetBootstrapForTests()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('нет сессии → ready, профиль не запрашивается', async () => {
    const user = useUserStore()
    const fetchSpy = vi.spyOn(user, 'fetchCurrentUser')

    await runBootstrapProcess()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(useBootstrapStore().isReady).toBe(true)
    expect(await isResolved(whenSessionRestored())).toBe(true)
  })

  it('сессия есть, профиль загружен → ready', async () => {
    withSession()
    const user = useUserStore()
    const fetchSpy = vi.spyOn(user, 'fetchCurrentUser').mockResolvedValue()

    await runBootstrapProcess()

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(useBootstrapStore().isReady).toBe(true)
  })

  it('401 → ready, а не экран ошибки: протухшая сессия ведёт на login', async () => {
    withSession()
    const user = useUserStore()
    vi.spyOn(user, 'fetchCurrentUser').mockRejectedValue(
      new HttpError(401, 'Unauthorized', 'UnauthorizedError', 'token expired'),
    )

    await runBootstrapProcess()

    const bootstrap = useBootstrapStore()
    expect(bootstrap.isReady).toBe(true)
    expect(bootstrap.isFailed).toBe(false)
    // Guard разблокирован — иначе приложение зависло бы на прелоадере.
    expect(await isResolved(whenSessionRestored())).toBe(true)
  })

  it('сетевой отказ → тихие повторы, затем failed с retryable-ошибкой', async () => {
    vi.useFakeTimers()
    withSession()
    const user = useUserStore()
    const fetchSpy = vi.spyOn(user, 'fetchCurrentUser').mockRejectedValue(HttpError.network())

    const promise = runBootstrapProcess()
    await vi.runAllTimersAsync()
    await promise

    // 1 основная попытка + 2 тихих повтора
    expect(fetchSpy).toHaveBeenCalledTimes(3)

    const bootstrap = useBootstrapStore()
    expect(bootstrap.isFailed).toBe(true)
    expect(bootstrap.error?.retryable).toBe(true)
    expect(bootstrap.error?.message).toBe('Не удалось связаться с сервером')
  })

  it('сетевой отказ оставляет guard заблокированным до успешного повтора', async () => {
    vi.useFakeTimers()
    const auth = withSession()
    const user = useUserStore()
    const fetchSpy = vi.spyOn(user, 'fetchCurrentUser').mockRejectedValue(HttpError.network())

    const failing = runBootstrapProcess()
    await vi.runAllTimersAsync()
    await failing

    // Ключевой инвариант: пока сессия не восстановлена, guard не должен
    // принимать решение — иначе он уведёт залогиненного на login.
    expect(await isResolved(whenSessionRestored())).toBe(false)

    fetchSpy.mockResolvedValue()
    const retry = runBootstrapProcess()
    await vi.runAllTimersAsync()
    await retry

    expect(auth.isSessionActive).toBe(true)
    expect(useBootstrapStore().isReady).toBe(true)
    expect(await isResolved(whenSessionRestored())).toBe(true)
  })

  it('сломанный контракт → failed без повторов и без предложения «Повторить»', async () => {
    vi.useFakeTimers()
    withSession()
    const user = useUserStore()
    const zodError = z.object({ a: z.string() }).safeParse({ a: 1 }).error!
    const fetchSpy = vi.spyOn(user, 'fetchCurrentUser').mockRejectedValue(zodError)

    const promise = runBootstrapProcess()
    await vi.runAllTimersAsync()
    await promise

    expect(fetchSpy).toHaveBeenCalledOnce()

    const bootstrap = useBootstrapStore()
    expect(bootstrap.isFailed).toBe(true)
    expect(bootstrap.error?.kind).toBe('contract')
    expect(bootstrap.error?.retryable).toBe(false)
    // Возврата нет — guard разблокирован, чтобы не держать навигацию.
    expect(await isResolved(whenSessionRestored())).toBe(true)
  })

  it('не пробрасывает отказ наружу — экран ошибки рисуется по состоянию стора', async () => {
    vi.useFakeTimers()
    withSession()
    const user = useUserStore()
    vi.spyOn(user, 'fetchCurrentUser').mockRejectedValue(HttpError.network())

    const promise = runBootstrapProcess()
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBeUndefined()
  })
})
