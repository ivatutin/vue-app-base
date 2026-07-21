import { QueryClient } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { setQueryClient } from '@/shared/api'
import { logoutFlow } from './logout-flow'

describe('logoutFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('happy path — auth.logout затем user.reset', async () => {
    const auth = useAuthStore()
    const user = useUserStore()
    const logoutSpy = vi.spyOn(auth, 'logout').mockResolvedValue()
    const resetSpy = vi.spyOn(user, 'reset')

    await logoutFlow()

    expect(logoutSpy).toHaveBeenCalledOnce()
    expect(resetSpy).toHaveBeenCalledOnce()
    expect(logoutSpy.mock.invocationCallOrder[0]).toBeLessThan(
      resetSpy.mock.invocationCallOrder[0]!,
    )
  })

  it('user.reset зовётся даже если auth.logout пробросил', async () => {
    const auth = useAuthStore()
    const user = useUserStore()
    const err = new Error('sign-out failed')
    vi.spyOn(auth, 'logout').mockRejectedValue(err)
    const resetSpy = vi.spyOn(user, 'reset')

    await expect(logoutFlow()).rejects.toBe(err)
    expect(resetSpy).toHaveBeenCalledOnce()
  })
})

/**
 * Регрессия: кэш TanStack Query не чистился при выходе. Ключ
 * `['users','me']` переживал смену аккаунта, и следующий вошедший
 * в той же вкладке видел чужой профиль в течение staleTime (30 с),
 * пока шёл фоновый refetch.
 */
describe('logoutFlow — изоляция данных между аккаунтами', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function seedCache (): QueryClient {
    const queryClient = new QueryClient()
    setQueryClient(queryClient)
    queryClient.setQueryData(['users', 'me'], { id: 'user-a', email: 'a@test.com' })
    queryClient.setQueryData(['orders'], [{ id: 1 }])
    return queryClient
  }

  it('очищает весь серверный кэш, а не только профиль', async () => {
    const queryClient = seedCache()
    vi.spyOn(useAuthStore(), 'logout').mockResolvedValue()

    expect(queryClient.getQueryData(['users', 'me'])).toBeDefined()

    await logoutFlow()

    expect(queryClient.getQueryData(['users', 'me'])).toBeUndefined()
    expect(queryClient.getQueryData(['orders'])).toBeUndefined()
  })

  it('чистит кэш даже если sign-out на бэке упал', async () => {
    const queryClient = seedCache()
    vi.spyOn(useAuthStore(), 'logout').mockRejectedValue(new Error('network down'))

    await expect(logoutFlow()).rejects.toThrow('network down')

    // Иначе оффлайн-выход оставлял бы чужие данные в кэше.
    expect(queryClient.getQueryData(['users', 'me'])).toBeUndefined()
  })

  it('не падает, если Query-провайдер не поднят', async () => {
    setQueryClient(undefined as never)
    vi.spyOn(useAuthStore(), 'logout').mockResolvedValue()

    await expect(logoutFlow()).resolves.toBeUndefined()
  })
})
