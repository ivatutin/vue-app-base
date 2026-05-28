import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { logoutFlow } from './logout-flow'

describe('logoutFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
