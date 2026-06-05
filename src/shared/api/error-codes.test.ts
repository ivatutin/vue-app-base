import { describe, expect, it } from 'vitest'
import {
  ERROR_MESSAGES,
  ErrorCode,
  getErrorMessage,
  getRetryAfter,
  matchError,
} from './error-codes'
import { HttpError } from './http-error'

describe('matchError', () => {
  it('возвращает true для HttpError с подходящим errorName', () => {
    const err = new HttpError(409, 'Conflict', ErrorCode.CONTACT_ALREADY_EXISTS, 'msg')
    expect(matchError(err, ErrorCode.CONTACT_ALREADY_EXISTS)).toBe(true)
  })

  it('возвращает false для HttpError с другим errorName', () => {
    const err = new HttpError(409, 'Conflict', ErrorCode.CONTACT_ALREADY_EXISTS, 'msg')
    expect(matchError(err, ErrorCode.OTP_INVALID)).toBe(false)
  })

  it('возвращает false для обычного Error', () => {
    expect(matchError(new Error('boom'), ErrorCode.OTP_INVALID)).toBe(false)
  })

  it('возвращает false для null / undefined / строки', () => {
    expect(matchError(null, ErrorCode.OTP_INVALID)).toBe(false)
    expect(matchError(undefined, ErrorCode.OTP_INVALID)).toBe(false)
    expect(matchError('error', ErrorCode.OTP_INVALID)).toBe(false)
  })
})

describe('getErrorMessage', () => {
  it('возвращает сообщение из реестра для известного errorName', () => {
    const err = new HttpError(422, 'Unprocessable', ErrorCode.OTP_EXPIRED, 'raw')
    expect(getErrorMessage(err)).toBe(ERROR_MESSAGES[ErrorCode.OTP_EXPIRED])
  })

  it('возвращает дефолт для HttpError с незнакомым errorName', () => {
    const err = new HttpError(500, 'Internal', 'SomeUnknownThing', 'raw')
    expect(getErrorMessage(err)).toBe('Что-то пошло не так')
  })

  it('возвращает дефолт для обычной Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('Что-то пошло не так')
  })

  it('возвращает дефолт для не-Error значений', () => {
    expect(getErrorMessage(null)).toBe('Что-то пошло не так')
    expect(getErrorMessage('strings are not errors')).toBe('Что-то пошло не так')
  })
})

describe('getRetryAfter', () => {
  it('читает retryAfter из details OTP_RATE_LIMITED', () => {
    const err = new HttpError(422, 'Unprocessable', ErrorCode.OTP_RATE_LIMITED, 'msg', {
      retryAfter: 60,
    })
    expect(getRetryAfter(err)).toBe(60)
  })

  it('возвращает null если errorName другой', () => {
    const err = new HttpError(422, 'Unprocessable', ErrorCode.OTP_INVALID, 'msg', {
      retryAfter: 60,
    })
    expect(getRetryAfter(err)).toBeNull()
  })

  it('возвращает null если details отсутствуют или невалидны', () => {
    expect(getRetryAfter(new HttpError(422, 'X', ErrorCode.OTP_RATE_LIMITED, 'm'))).toBeNull()
    expect(getRetryAfter(new HttpError(422, 'X', ErrorCode.OTP_RATE_LIMITED, 'm', { foo: 1 }))).toBeNull()
    expect(getRetryAfter(new HttpError(422, 'X', ErrorCode.OTP_RATE_LIMITED, 'm', { retryAfter: 'soon' }))).toBeNull()
  })

  it('возвращает null для не-HttpError', () => {
    expect(getRetryAfter(new Error('boom'))).toBeNull()
    expect(getRetryAfter(null)).toBeNull()
  })
})

describe('ERROR_MESSAGES', () => {
  it('покрывает все ErrorCode значения', () => {
    const codes = Object.values(ErrorCode)
    for (const code of codes) {
      expect(ERROR_MESSAGES[code]).toBeTypeOf('string')
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    }
  })
})
