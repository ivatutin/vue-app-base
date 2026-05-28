import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { HttpError } from '@/shared/api'
import { loginFlow } from './login-flow'

describe('loginFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('happy path — auth.login → user.fetchCurrentUser в правильном порядке', async () => {
    const auth = useAuthStore()
    const user = useUserStore()
    const loginSpy = vi.spyOn(auth, 'login').mockResolvedValue()
    const fetchSpy = vi.spyOn(user, 'fetchCurrentUser').mockResolvedValue()

    await loginFlow('test@test.com', 'secret')

    expect(loginSpy).toHaveBeenCalledWith('test@test.com', 'secret')
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(loginSpy.mock.invocationCallOrder[0]).toBeLessThan(
      fetchSpy.mock.invocationCallOrder[0]!,
    )
  })

  it('auth.login fail → fetchCurrentUser не зовётся, ошибка пробрасывается', async () => {
    const auth = useAuthStore()
    const user = useUserStore()
    const err = new HttpError(401, 'Unauthorized', 'InvalidCredentialsError', 'Invalid credentials')
    vi.spyOn(auth, 'login').mockRejectedValue(err)
    const fetchSpy = vi.spyOn(user, 'fetchCurrentUser')
    const logoutSpy = vi.spyOn(auth, 'logout')
    const resetSpy = vi.spyOn(user, 'reset')

    await expect(loginFlow('test@test.com', 'wrong')).rejects.toBe(err)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(logoutSpy).not.toHaveBeenCalled()
    expect(resetSpy).not.toHaveBeenCalled()
  })

  it('fetchUser fail после login → compensating: auth.logout + user.reset + throw', async () => {
    vi.useFakeTimers()
    const auth = useAuthStore()
    const user = useUserStore()
    const fetchErr = new Error('profile fetch failed')
    vi.spyOn(auth, 'login').mockResolvedValue()
    vi.spyOn(user, 'fetchCurrentUser').mockRejectedValue(fetchErr)
    const logoutSpy = vi.spyOn(auth, 'logout').mockResolvedValue()
    const resetSpy = vi.spyOn(user, 'reset')

    const promise = loginFlow('test@test.com', 'secret')
    // retryOn404 пропустит этот error (не HttpError), пойдёт прямо в rollback.
    await expect(promise).rejects.toBe(fetchErr)
    expect(logoutSpy).toHaveBeenCalledOnce()
    expect(resetSpy).toHaveBeenCalledOnce()
  })

  it('fetchUser 404 один раз, потом успех — retry срабатывает, без rollback', async () => {
    vi.useFakeTimers()
    const auth = useAuthStore()
    const user = useUserStore()
    const err404 = new HttpError(404, 'Not Found', 'EntityNotFoundError', 'User not found')
    vi.spyOn(auth, 'login').mockResolvedValue()
    const fetchSpy = vi
      .spyOn(user, 'fetchCurrentUser')
      .mockRejectedValueOnce(err404)
      .mockResolvedValue()
    const logoutSpy = vi.spyOn(auth, 'logout')
    const resetSpy = vi.spyOn(user, 'reset')

    const promise = loginFlow('test@test.com', 'secret')
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(logoutSpy).not.toHaveBeenCalled()
    expect(resetSpy).not.toHaveBeenCalled()
  })
})
