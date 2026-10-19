import type { HttpClient } from '@/shared/api'
import { describe, expect, it, vi } from 'vitest'
import { setHttpClient } from '@/shared/api'
import { cancelContactChange, requestContactChange, verifyContactChange } from '.'

describe('contact-change api', () => {
  it('request: POST с X-Reauth-Token, ответ разбирается вместе с каналом', async () => {
    const post = vi.fn(async () => ({
      changeToken: 'ct-1',
      requiresOldChallenge: true,
      oldChallengeId: 'old-1',
      newChallengeId: 'new-1',
    }))
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)

    const challenge = await requestContactChange('rt-1', {
      channel: 'email',
      newValue: 'new@example.test',
    })

    expect(post).toHaveBeenCalledWith(
      '/users/me/contact-change/request',
      { channel: 'email', newValue: 'new@example.test' },
      { headers: { 'X-Reauth-Token': 'rt-1' } },
    )
    expect(challenge).toMatchObject({
      changeToken: 'ct-1',
      requiresOldChallenge: true,
      channel: 'email',
      newValue: 'new@example.test',
    })
  })

  it('verify: oldCode уходит только когда он есть', async () => {
    const post = vi.fn(async () => undefined)
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)

    await verifyContactChange({ changeToken: 'ct-1', newCode: '123456' })

    // Без `oldCode` ключа в теле нет: бэкенд отличает «не требуется» от пустой строки.
    expect(post).toHaveBeenCalledWith('/users/me/contact-change/verify', {
      changeToken: 'ct-1',
      newCode: '123456',
    })

    await verifyContactChange({ changeToken: 'ct-1', newCode: '123456', oldCode: '654321' })

    expect(post).toHaveBeenLastCalledWith('/users/me/contact-change/verify', {
      changeToken: 'ct-1',
      newCode: '123456',
      oldCode: '654321',
    })
  })

  it('cancel: POST с changeToken', async () => {
    const post = vi.fn(async () => undefined)
    setHttpClient({ post, get: vi.fn() } as unknown as HttpClient)

    await cancelContactChange('ct-1')

    expect(post).toHaveBeenCalledWith('/users/me/contact-change/cancel', { changeToken: 'ct-1' })
  })
})
