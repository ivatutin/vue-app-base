import type { User } from '@/entities/user'
import type { HttpClient } from '@/shared/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { HttpError, setHttpClient } from '@/shared/api'
import { logoutAllFlow } from './logout-all-flow'

const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 300 }

function profile (): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.test',
    phone: null,
    emailVerified: true,
    phoneVerified: false,
    firstName: null,
    lastName: null,
    roles: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('logoutAllFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('успех: серверный отзыв, затем локальная очистка', async () => {
    const post = vi.fn(async () => undefined)
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const auth = useAuthStore()
    const user = useUserStore()
    auth.applyTokenPair(TOKENS)
    user.user = profile()

    await logoutAllFlow()

    expect(post).toHaveBeenCalledWith('/users/me/logout-all')
    expect(auth.accessToken).toBeNull()
    expect(auth.refreshToken).toBeNull()
    expect(user.user).toBeNull()
  })

  it('503: не отозвано ничего — сессия остаётся на месте', async () => {
    const unavailable = new HttpError(
      503,
      'Service Unavailable',
      'ServiceUnavailable',
      'Keycloak недоступен',
    )
    const post = vi.fn(async () => {
      throw unavailable
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const auth = useAuthStore()
    const user = useUserStore()
    auth.applyTokenPair(TOKENS)
    user.user = profile()

    await expect(logoutAllFlow()).rejects.toBe(unavailable)

    expect(post).toHaveBeenCalledOnce()
    expect(auth.accessToken).toBe('access-1')
    expect(user.user).not.toBeNull()
  })
})
