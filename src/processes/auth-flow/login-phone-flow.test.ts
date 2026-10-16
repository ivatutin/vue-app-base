import type { HttpClient } from '@/shared/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { ErrorCode, HttpError, setHttpClient } from '@/shared/api'
import { loginPhoneFlow } from './login-phone-flow'

const TOKENS = { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 300 }

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

function stubClient (options: { signIn?: unknown, signInFails?: Error } = {}) {
  const post = vi.fn(async (path: string, _body?: unknown, _options?: unknown) => {
    if (path === '/auth/sign-in/phone') {
      if (options.signInFails) {
        throw options.signInFails
      }
      return options.signIn ?? TOKENS
    }
    if (path === '/auth/sign-out') {
      return undefined
    }
    throw new Error(`unexpected POST ${path}`)
  })
  const get = vi.fn(async (path: string) => {
    if (path === '/users/me') {
      return profileDto()
    }
    throw new Error(`unexpected GET ${path}`)
  })
  setHttpClient({ post, get } as unknown as HttpClient)
  return { post, get }
}

describe('loginPhoneFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sign-in/phone → применяет токены и грузит профиль', async () => {
    const { post, get } = stubClient()
    const auth = useAuthStore()
    const user = useUserStore()

    await loginPhoneFlow('+79991234567', 'vt-1')

    const [path, body, requestOptions] = post.mock.calls[0] as [string, unknown, unknown]
    expect(path).toBe('/auth/sign-in/phone')
    expect(body).toEqual({ phone: '+79991234567', verificationToken: 'vt-1' })
    expect(requestOptions).toEqual({ auth: false })
    expect(get).toHaveBeenCalledWith('/users/me')

    expect(auth.accessToken).toBe('access-2')
    expect(user.isAuthorized).toBe(true)
  })

  it('401 InvalidCredentials (номер не зарегистрирован) → сессия не установлена', async () => {
    const invalid = new HttpError(401, 'Unauthorized', ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials')
    stubClient({ signInFails: invalid })
    const auth = useAuthStore()

    await expect(loginPhoneFlow('+79991234567', 'vt-1')).rejects.toBe(invalid)

    expect(auth.accessToken).toBeNull()
    expect(auth.isSessionActive).toBe(false)
  })

  it('некорректный номер отсекается до сети', async () => {
    const { post } = stubClient()

    await expect(loginPhoneFlow('+7999', 'vt-1')).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })
})
