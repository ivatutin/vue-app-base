import type { HttpClient } from '@/shared/api'
import { describe, expect, it, vi } from 'vitest'
import { setHttpClient } from '@/shared/api'
import { updateUserProfile } from './update-profile'

function userDto () {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'anna@example.test',
    phone: null,
    emailVerified: true,
    phoneVerified: false,
    firstName: 'Анна',
    lastName: null,
    roles: ['user'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('updateUserProfile', () => {
  it('PATCH /users/:id/profile и разбор полного профиля из ответа', async () => {
    const patch = vi.fn(async () => userDto())
    setHttpClient({ patch, get: vi.fn() } as unknown as HttpClient)

    const user = await updateUserProfile('11111111-1111-4111-8111-111111111111', {
      firstName: 'Анна',
      lastName: null,
    })

    expect(patch).toHaveBeenCalledWith(
      '/users/11111111-1111-4111-8111-111111111111/profile',
      { firstName: 'Анна', lastName: null },
    )
    expect(user.firstName).toBe('Анна')
    expect(user.lastName).toBeNull()
    // Роли приходят в ответе — применение профиля не должно их терять.
    expect(user.roles).toEqual(['user'])
  })

  it('пустое тело отсекается до сети (бэкенд требует хотя бы одно поле)', async () => {
    const patch = vi.fn()
    setHttpClient({ patch, get: vi.fn() } as unknown as HttpClient)

    await expect(updateUserProfile('11111111-1111-4111-8111-111111111111', {})).rejects.toThrow()

    expect(patch).not.toHaveBeenCalled()
  })
})
