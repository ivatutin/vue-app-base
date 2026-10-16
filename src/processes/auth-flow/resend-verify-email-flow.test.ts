import type { HttpClient } from '@/shared/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRegistrationStore } from '@/entities/auth'
import { HttpError, setHttpClient } from '@/shared/api'
import { emailSchema } from '@/shared/model/credentials'
import { resendVerifyEmailFlow } from './resend-verify-email-flow'

/** Стаб HTTP-клиента — как и у register-флоу: проверяем всю цепочку до запроса. */
function stubPost (
  impl: (path: string, body?: unknown, options?: unknown) => Promise<unknown>,
): ReturnType<typeof vi.fn> {
  const post = vi.fn(impl)
  setHttpClient({ post } as unknown as HttpClient)
  return post
}

describe('resendVerifyEmailFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('берёт адрес из стора и помечает письмо отправленным', async () => {
    const post = stubPost(async () => undefined)
    const store = useRegistrationStore()
    store.rememberSignUp(emailSchema.parse('user@example.com'), false)

    await resendVerifyEmailFlow()

    const [path, body, options] = post.mock.calls[0] as [string, unknown, unknown]
    expect(path).toBe('/auth/verify-email/resend')
    expect(body).toEqual({ email: 'user@example.com' })
    expect(options).toEqual({ auth: false })

    expect(store.verifyEmailSent).toBe(true)
    expect(store.alreadyRegistered).toBe(false)
  })

  it('принимает адрес аргументом и запоминает его — сценарий «после перезагрузки»', async () => {
    const post = stubPost(async () => undefined)
    const store = useRegistrationStore()

    await resendVerifyEmailFlow('Person@Example.com')

    expect(post).toHaveBeenCalledOnce()
    expect(store.pendingEmail).toBe('person@example.com')
    expect(store.verifyEmailSent).toBe(true)
  })

  it('без адреса — ошибка, запрос не уходит', async () => {
    const post = stubPost(async () => undefined)
    const store = useRegistrationStore()

    await expect(resendVerifyEmailFlow()).rejects.toThrow('No email to resend verification to')

    expect(post).not.toHaveBeenCalled()
    expect(store.verifyEmailSent).toBe(false)
  })

  it('ошибку пробрасывает и НЕ помечает письмо отправленным', async () => {
    const failure = new HttpError(500, 'Internal', 'InternalServerError', 'boom')
    stubPost(async () => {
      throw failure
    })
    const store = useRegistrationStore()
    store.rememberSignUp(emailSchema.parse('user@example.com'), false)

    await expect(resendVerifyEmailFlow()).rejects.toBe(failure)

    expect(store.verifyEmailSent).toBe(false)
  })
})
