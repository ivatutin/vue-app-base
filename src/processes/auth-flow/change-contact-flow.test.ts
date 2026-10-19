import type { ContactChangeChallenge } from '@/entities/contact-change'
import type { User } from '@/entities/user'
import type { HttpClient } from '@/shared/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/entities/auth'
import { useContactChangeStore } from '@/entities/contact-change'
import { useUserStore } from '@/entities/user'
import { ErrorCode, HttpError, setHttpClient } from '@/shared/api'
import {
  cancelContactChangeFlow,
  requestContactChangeFlow,
  verifyContactChangeFlow,
} from './change-contact-flow'

const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 300 }

const INPUT = {
  currentPassword: 'old-password',
  channel: 'email' as const,
  newValue: 'new@example.test',
}

function challenge (overrides: Partial<ContactChangeChallenge> = {}): ContactChangeChallenge {
  return {
    changeToken: 'ct-1',
    requiresOldChallenge: false,
    oldChallengeId: null,
    newChallengeId: 'new-1',
    channel: 'email',
    newValue: 'new@example.test',
    ...overrides,
  }
}

function pendingError (): HttpError {
  return new HttpError(
    422,
    'Unprocessable Entity',
    ErrorCode.CONTACT_CHANGE_ALREADY_PENDING,
    'already pending',
  )
}

function profile (): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'old@example.test',
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

describe('requestContactChangeFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reauth → request: токен смены в сторе, стадия codes', async () => {
    const post = vi.fn(async (path: string) => {
      if (path === '/auth/reauth') {
        return { reauthToken: 'rt-1', expiresAt: new Date().toISOString() }
      }
      return { changeToken: 'ct-1', requiresOldChallenge: false, oldChallengeId: null, newChallengeId: 'new-1' }
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const store = useContactChangeStore()

    await requestContactChangeFlow(INPUT)

    expect(post.mock.calls.map(call => call[0])).toEqual([
      '/auth/reauth',
      '/users/me/contact-change/request',
    ])
    expect(store.stage).toBe('codes')
    expect(store.changeToken).toBe('ct-1')
    expect(store.newValue).toBe('new@example.test')
  })

  it('AlreadyPending: cancel прежней смены → новый reauth → повторный request', async () => {
    const store = useContactChangeStore()
    store.startChallenge(challenge({ changeToken: 'ct-old' }))

    let reauthCount = 0
    let requestCount = 0
    const post = vi.fn(async (path: string, _body?: unknown) => {
      if (path === '/auth/reauth') {
        reauthCount += 1
        return { reauthToken: `rt-${reauthCount}`, expiresAt: new Date().toISOString() }
      }
      if (path === '/users/me/contact-change/cancel') {
        return undefined
      }
      requestCount += 1
      if (requestCount === 1) {
        throw pendingError()
      }
      return { changeToken: 'ct-new', requiresOldChallenge: true, oldChallengeId: 'old-2', newChallengeId: 'new-2' }
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)

    await requestContactChangeFlow(INPUT)

    expect(post.mock.calls.map(call => call[0])).toEqual([
      '/auth/reauth',
      '/users/me/contact-change/request',
      '/users/me/contact-change/cancel',
      '/auth/reauth',
      '/users/me/contact-change/request',
    ])
    // reauth одноразовый — второй запрос идёт с новым токеном.
    expect(post.mock.calls[3]![1]).toEqual({ password: 'old-password' })
    expect(store.changeToken).toBe('ct-new')
    expect(store.requiresOldChallenge).toBe(true)
  })

  it('AlreadyPending без сохранённого токена: отменять нечего — ошибка наружу', async () => {
    const post = vi.fn(async (path: string) => {
      if (path === '/auth/reauth') {
        return { reauthToken: 'rt-1', expiresAt: new Date().toISOString() }
      }
      throw pendingError()
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const store = useContactChangeStore()

    await expect(requestContactChangeFlow(INPUT)).rejects.toMatchObject({
      errorName: ErrorCode.CONTACT_CHANGE_ALREADY_PENDING,
    })

    expect(store.stage).toBe('idle')
  })
})

describe('verifyContactChangeFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('успех: стадия done, локальная сессия сброшена (доступ отозван бэкендом)', async () => {
    const post = vi.fn(async () => undefined)
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const store = useContactChangeStore()
    store.startChallenge(challenge())
    const auth = useAuthStore()
    const user = useUserStore()
    auth.applyTokenPair(TOKENS)
    user.user = profile()

    await verifyContactChangeFlow({ newCode: '123456' })

    expect(post).toHaveBeenCalledWith('/users/me/contact-change/verify', {
      changeToken: 'ct-1',
      newCode: '123456',
    })
    expect(store.stage).toBe('done')
    expect(auth.accessToken).toBeNull()
    expect(user.user).toBeNull()
  })

  it('503: ничего не применено — токен смены и сессия живы', async () => {
    const unavailable = new HttpError(503, 'Service Unavailable', 'ServiceUnavailable', 'Keycloak')
    const post = vi.fn(async () => {
      throw unavailable
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const store = useContactChangeStore()
    store.startChallenge(challenge())
    const auth = useAuthStore()
    auth.applyTokenPair(TOKENS)

    await expect(verifyContactChangeFlow({ newCode: '123456' })).rejects.toBe(unavailable)

    expect(store.stage).toBe('codes')
    expect(store.changeToken).toBe('ct-1')
    expect(auth.accessToken).toBe('access-1')
  })
})

describe('cancelContactChangeFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('освобождает смену и возвращает форму в idle', async () => {
    const post = vi.fn(async () => undefined)
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const store = useContactChangeStore()
    store.startChallenge(challenge())

    await cancelContactChangeFlow()

    expect(post).toHaveBeenCalledWith('/users/me/contact-change/cancel', { changeToken: 'ct-1' })
    expect(store.stage).toBe('idle')
    expect(store.changeToken).toBeNull()
  })

  it('ChangeTokenExpired = смены уже нет — тоже возвращаем idle', async () => {
    const expired = new HttpError(422, 'Unprocessable Entity', ErrorCode.CHANGE_TOKEN_EXPIRED, 'expired')
    const post = vi.fn(async () => {
      throw expired
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const store = useContactChangeStore()
    store.startChallenge(challenge())

    await cancelContactChangeFlow()

    expect(store.stage).toBe('idle')
  })
})
