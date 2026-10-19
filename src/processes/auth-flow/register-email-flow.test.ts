import type { HttpClient } from '@/shared/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRegistrationStore } from '@/entities/auth'
import { ErrorCode, HttpError, setHttpClient } from '@/shared/api'
import { registerEmailFlow } from './register-email-flow'

/**
 * Флоу тестируем через стаб HTTP-клиента (а не мок модуля `@/entities/auth`):
 * так в проверку попадает вся цепочка — нормализация → Zod-DTO → api → стор.
 */
const VALID = {
  email: 'User@Example.com',
  password: 'correct horse battery',
  acceptedTerms: true,
}

interface PostCall {
  path: string
  body: unknown
  options: unknown
}

function stubPost (
  impl: (path: string, body?: unknown, options?: unknown) => Promise<unknown>,
): ReturnType<typeof vi.fn> {
  const post = vi.fn(impl)
  setHttpClient({ post } as unknown as HttpClient)
  return post
}

function firstCall (post: ReturnType<typeof vi.fn>): PostCall {
  const [path, body, options] = post.mock.calls[0] as [string, unknown, unknown]
  return { path, body, options }
}

describe('registerEmailFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('нормализует email, зовёт sign-up/email и запоминает отправку', async () => {
    const post = stubPost(async () => ({ user: { id: 'u1' }, verifyEmailSent: true }))
    const store = useRegistrationStore()

    const sent = await registerEmailFlow(VALID)

    expect(sent).toBe(true)

    const call = firstCall(post)
    expect(call.path).toBe('/auth/sign-up/email')
    expect(call.body).toEqual({
      email: 'user@example.com',
      password: 'correct horse battery',
      acceptedTerms: true,
    })
    expect(call.options).toEqual({ auth: false })

    expect(store.pendingEmail).toBe('user@example.com')
    expect(store.verifyEmailSent).toBe(true)
    expect(store.alreadyRegistered).toBe(false)
  })

  it('передаёт необязательные имя/фамилию в sign-up/email', async () => {
    // Эти поля заполняют shadow-БД на регистрации: иначе имя живёт только в Keycloak
    // (реалм требует его у роли `user`), а `/users/me` отдаёт null.
    const post = stubPost(async () => ({ verifyEmailSent: true }))

    await registerEmailFlow({ ...VALID, firstName: 'Анна', lastName: 'Петрова' })

    expect(firstCall(post).body).toMatchObject({ firstName: 'Анна', lastName: 'Петрова' })
  })

  it('verifyEmailSent: false доходит до стора — экран покажет «письмо не ушло»', async () => {
    stubPost(async () => ({ user: { id: 'u1' }, verifyEmailSent: false }))
    const store = useRegistrationStore()

    await expect(registerEmailFlow(VALID)).resolves.toBe(false)

    expect(store.verifyEmailSent).toBe(false)
    expect(store.pendingEmail).toBe('user@example.com')
  })

  it('409 ContactAlreadyExists: помечает конфликт и пробрасывает ошибку', async () => {
    const conflict = new HttpError(409, 'Conflict', ErrorCode.CONTACT_ALREADY_EXISTS, 'taken')
    stubPost(async () => {
      throw conflict
    })
    const store = useRegistrationStore()

    await expect(registerEmailFlow(VALID)).rejects.toBe(conflict)

    expect(store.alreadyRegistered).toBe(true)
    expect(store.pendingEmail).toBe('user@example.com')
    expect(store.verifyEmailSent).toBe(false)
  })

  it('короткий пароль отсекается до сети', async () => {
    const post = stubPost(async () => ({ verifyEmailSent: true }))

    await expect(
      registerEmailFlow({ ...VALID, password: 'short' }),
    ).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('некорректный email отсекается до сети', async () => {
    const post = stubPost(async () => ({ verifyEmailSent: true }))

    await expect(
      registerEmailFlow({ ...VALID, email: 'not-an-email' }),
    ).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('без согласия с условиями запрос не уходит', async () => {
    const post = stubPost(async () => ({ verifyEmailSent: true }))

    await expect(
      registerEmailFlow({ ...VALID, acceptedTerms: false }),
    ).rejects.toThrow('Terms are not accepted')

    expect(post).not.toHaveBeenCalled()
  })
})
