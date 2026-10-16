import type { HttpClient } from '@/shared/api'
import type { Email, Password } from '@/shared/model/credentials'
import { describe, expect, it, vi } from 'vitest'
import { HttpError, setHttpClient } from '@/shared/api'
import { emailSchema, passwordSchema } from '@/shared/model/credentials'
import { resendVerifyEmail, signUpEmail } from './index'

const EMAIL: Email = emailSchema.parse('User@Example.com')
const PASSWORD: Password = passwordSchema.parse('correct horse battery')

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

describe('signUpEmail', () => {
  it('POST /auth/sign-up/email: тело контракта, нормализованный email, без Bearer', async () => {
    const post = stubPost(async () => ({ user: { id: 'u1' }, verifyEmailSent: true }))

    const sent = await signUpEmail({ email: EMAIL, password: PASSWORD, acceptedTerms: true })

    const call = firstCall(post)
    expect(call.path).toBe('/auth/sign-up/email')
    expect(call.body).toEqual({
      email: 'user@example.com',
      password: 'correct horse battery',
      acceptedTerms: true,
    })
    expect(call.options).toEqual({ auth: false })
    expect(sent).toBe(true)
  })

  it('verifyEmailSent: false не считается ошибкой — регистрация состоялась', async () => {
    stubPost(async () => ({ user: { id: 'u1' }, verifyEmailSent: false }))

    await expect(
      signUpEmail({ email: EMAIL, password: PASSWORD, acceptedTerms: true }),
    ).resolves.toBe(false)
  })

  it('неожиданная форма ответа → ошибка валидации DTO', async () => {
    stubPost(async () => ({ user: { id: 'u1' } }))

    await expect(
      signUpEmail({ email: EMAIL, password: PASSWORD, acceptedTerms: true }),
    ).rejects.toThrow()
  })

  it('пароль короче политики реалма отсекается до сети', async () => {
    const post = stubPost(async () => ({ verifyEmailSent: true }))

    await expect(
      signUpEmail({
        email: EMAIL,
        password: 'short' as unknown as Password,
        acceptedTerms: true,
      }),
    ).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('пробрасывает HttpError бэкенда как есть (409 ContactAlreadyExists)', async () => {
    const err = new HttpError(409, 'Conflict', 'ContactAlreadyExists', 'Email already exists')
    stubPost(async () => {
      throw err
    })

    await expect(
      signUpEmail({ email: EMAIL, password: PASSWORD, acceptedTerms: true }),
    ).rejects.toBe(err)
  })
})

describe('resendVerifyEmail', () => {
  it('POST /auth/verify-email/resend: нормализует email и терпит пустое тело 202', async () => {
    const post = stubPost(async () => undefined)

    await expect(resendVerifyEmail(emailSchema.parse('  A@B.Co  '))).resolves.toBeUndefined()

    const call = firstCall(post)
    expect(call.path).toBe('/auth/verify-email/resend')
    expect(call.body).toEqual({ email: 'a@b.co' })
    expect(call.options).toEqual({ auth: false })
  })
})
