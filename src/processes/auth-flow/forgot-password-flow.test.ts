import type { HttpClient } from '@/shared/api'
import { describe, expect, it, vi } from 'vitest'
import { HttpError, setHttpClient } from '@/shared/api'
import { forgotPasswordFlow } from './forgot-password-flow'

/** Стаб HTTP-клиента: как и в остальных флоу-тестах — типизированная имплементация. */
function stubPost (
  impl: (path: string, body?: unknown, options?: unknown) => Promise<unknown>,
): ReturnType<typeof vi.fn> {
  const post = vi.fn(impl)
  setHttpClient({ post } as unknown as HttpClient)
  return post
}

describe('forgotPasswordFlow', () => {
  it('нормализует email и зовёт forgot-password без Bearer', async () => {
    const post = stubPost(async () => undefined)

    await expect(forgotPasswordFlow('User@Example.com')).resolves.toBeUndefined()

    const [path, body, options] = post.mock.calls[0] as [string, unknown, unknown]
    expect(path).toBe('/auth/forgot-password')
    expect(body).toEqual({ email: 'user@example.com' })
    expect(options).toEqual({ auth: false })
  })

  it('некорректный email отсекается до сети', async () => {
    const post = stubPost(async () => undefined)

    await expect(forgotPasswordFlow('not-an-email')).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('ошибку бэкенда пробрасывает — страница покажет сообщение', async () => {
    const failure = new HttpError(500, 'Internal', 'InternalServerError', 'boom')
    stubPost(async () => {
      throw failure
    })

    await expect(forgotPasswordFlow('user@example.com')).rejects.toBe(failure)
  })
})
