import type { HttpClient } from '@/shared/api'
import { describe, expect, it, vi } from 'vitest'
import { ErrorCode, getErrorMessage, HttpError, matchError, setHttpClient } from '@/shared/api'
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
  it('PATCH /users/me/profile и разбор полного профиля из ответа', async () => {
    const patch = vi.fn(async () => userDto())
    setHttpClient({ patch, get: vi.fn() } as unknown as HttpClient)

    const user = await updateUserProfile({
      firstName: 'Анна',
      lastName: null,
    })

    expect(patch).toHaveBeenCalledWith(
      '/users/me/profile',
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

    await expect(updateUserProfile({})).rejects.toThrow()

    expect(patch).not.toHaveBeenCalled()
  })

  it('503 с Retry-After доходит до UI как ServiceUnavailable + retryAfterSeconds', async () => {
    // Keycloak недоступен → бэкенд отдаёт 503 ServiceUnavailable и Retry-After.
    // Профиль не должен глотать ошибку: текст и задержка нужны пользователю.
    const unavailable = new HttpError(
      503,
      'Service Unavailable',
      ErrorCode.SERVICE_UNAVAILABLE,
      'Internal server error',
      undefined,
      undefined,
      30,
    )
    const patch = vi.fn(async () => {
      throw unavailable
    })
    setHttpClient({ patch, get: vi.fn() } as unknown as HttpClient)

    const error = await updateUserProfile({ firstName: 'Анна' }).catch((error_: unknown) => error_)

    expect(matchError(error, ErrorCode.SERVICE_UNAVAILABLE)).toBe(true)
    expect((error as HttpError).retryAfterSeconds).toBe(30)
    expect(getErrorMessage(error)).toBe('Сервис временно недоступен — повторите через 30 с')
  })
})
