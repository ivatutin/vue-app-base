import type { HttpClient } from '@/shared/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { ErrorCode, HttpError, setHttpClient } from '@/shared/api'
import { registerPhoneFlow } from './register-phone-flow'

const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 300 }

function profileDto () {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: null,
    phone: '+79991234567',
    emailVerified: false,
    phoneVerified: true,
    firstName: null,
    lastName: null,
    roles: [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Стаб клиента: флоу ходит двумя запросами — `POST /auth/sign-up/phone` и
 * `GET /users/me` (профиль в общем финале входа), плюс `POST /auth/sign-out`
 * в ветке компенсации.
 */
function stubClient (options: { signUp?: unknown, me?: unknown, meFails?: Error } = {}) {
  const post = vi.fn(async (path: string, _body?: unknown, _options?: unknown) => {
    if (path === '/auth/sign-up/phone') {
      return options.signUp ?? { user: { id: '11111111-1111-4111-8111-111111111111' }, tokens: TOKENS }
    }
    if (path === '/auth/sign-out') {
      return undefined
    }
    throw new Error(`unexpected POST ${path}`)
  })
  const get = vi.fn(async (path: string) => {
    if (path === '/users/me') {
      if (options.meFails) {
        throw options.meFails
      }
      return options.me ?? profileDto()
    }
    throw new Error(`unexpected GET ${path}`)
  })
  setHttpClient({ post, get } as unknown as HttpClient)
  return { post, get }
}

const VALID = { phone: '+79991234567', verificationToken: 'vt-1', acceptedTerms: true }

describe('registerPhoneFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sign-up/phone → применяет токены и грузит профиль', async () => {
    const { post } = stubClient()
    const auth = useAuthStore()
    const user = useUserStore()

    await registerPhoneFlow(VALID)

    const [path, body, requestOptions] = post.mock.calls[0] as [string, unknown, unknown]
    expect(path).toBe('/auth/sign-up/phone')
    expect(body).toEqual({
      phone: '+79991234567',
      verificationToken: 'vt-1',
      acceptedTerms: true,
    })
    // `timeoutMs: 60 s` — окно под холодный CIBA-минт (ADR-0016 ред. 2).
    expect(requestOptions).toMatchObject({ auth: false, timeoutMs: 60_000 })

    expect(auth.accessToken).toBe('access-1')
    expect(auth.isSessionActive).toBe(true)
    expect(user.status).toBe('active')
    expect(user.isAuthorized).toBe(true)
  })

  it('409 ContactAlreadyExists пробрасывает и НЕ устанавливает сессию', async () => {
    const conflict = new HttpError(409, 'Conflict', ErrorCode.CONTACT_ALREADY_EXISTS, 'taken')
    const auth = useAuthStore()

    // Клиент, который отвечает ошибкой вместо ответа.
    setHttpClient({
      post: vi.fn(async () => {
        throw conflict
      }),
      get: vi.fn(),
    } as unknown as HttpClient)

    await expect(registerPhoneFlow(VALID)).rejects.toBe(conflict)
    expect(auth.accessToken).toBeNull()
  })

  it('таймаут не ретраится: sign-up/phone зовётся один раз, сессия не ставится', async () => {
    // ADR-0016 ред. 2: вызов неидемпотентный, бэкенд мог довести операцию после обрыва.
    const timeout = HttpError.timeout(30_000)
    const post = vi.fn(async () => {
      throw timeout
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)
    const auth = useAuthStore()

    await expect(registerPhoneFlow(VALID)).rejects.toBe(timeout)

    expect(post).toHaveBeenCalledOnce()
    expect(auth.accessToken).toBeNull()
  })

  it('некорректный номер отсекается до сети', async () => {
    const { post } = stubClient()

    await expect(
      registerPhoneFlow({ ...VALID, phone: '+7999' }),
    ).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('если профиль не загрузился — сессия откатывается (компенсация)', async () => {
    stubClient({ meFails: new Error('profile boom') })
    const auth = useAuthStore()
    const user = useUserStore()

    await expect(registerPhoneFlow(VALID)).rejects.toThrow('profile boom')

    expect(auth.accessToken).toBeNull()
    expect(user.isAuthenticated).toBe(false)
  })
})
