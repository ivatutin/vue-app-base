import type { HttpClient } from '@/shared/api'
import { describe, expect, it, vi } from 'vitest'
import { HttpError, setHttpClient } from '@/shared/api'
import { changePasswordFlow } from './change-password-flow'

describe('changePasswordFlow', () => {
  it('сначала reauth, затем смена пароля с X-Reauth-Token', async () => {
    const post = vi.fn(async (path: string, _body?: unknown, _options?: unknown) => {
      if (path === '/auth/reauth') {
        return { reauthToken: 'rt-1', expiresAt: new Date().toISOString() }
      }
      return undefined
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)

    await changePasswordFlow('old-password', 'new-password-123')

    expect(post).toHaveBeenCalledTimes(2)
    expect(post.mock.calls[0]![0]).toBe('/auth/reauth')
    expect(post.mock.calls[0]![1]).toEqual({ password: 'old-password' })
    expect(post.mock.calls[1]![0]).toBe('/users/me/password')
    expect(post.mock.calls[1]![1]).toEqual({ newPassword: 'new-password-123' })
    expect(post.mock.calls[1]![2]).toMatchObject({ headers: { 'X-Reauth-Token': 'rt-1' } })
  })

  it('неверный текущий пароль не доходит до смены', async () => {
    // Одноразовый reauth-токен не выдан — второй шаг не должен случиться.
    const invalid = new HttpError(401, 'Unauthorized', 'InvalidCredentials', 'Invalid credentials')
    const post = vi.fn(async (_path: string, _body?: unknown, _options?: unknown) => {
      throw invalid
    })
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)

    await expect(changePasswordFlow('wrong', 'new-password-123')).rejects.toBe(invalid)

    expect(post).toHaveBeenCalledOnce()
    expect(post.mock.calls[0]![0]).toBe('/auth/reauth')
  })
})
