import { describe, expect, it } from 'vitest'
import { HttpError } from '@/shared/api'
import { humanize } from './setup-error-handler'

describe('humanize', () => {
  it('для HttpError берёт русский текст из реестра, а не message сервера', () => {
    const err = new HttpError(401, 'Unauthorized', 'InvalidCredentials', 'Invalid credentials')
    expect(humanize(err)).toBe('Неверные учётные данные')
  })

  it('5xx без доменного кода — «Сервис временно недоступен»', () => {
    const err = new HttpError(503, 'Service Unavailable', 'Service Unavailable', 'Internal server error')
    expect(humanize(err)).toBe('Сервис временно недоступен')
  })

  it('обычная Error не показывает технический текст', () => {
    expect(humanize(new Error('Cannot read properties of undefined'))).toBe('Что-то пошло не так')
  })
})
