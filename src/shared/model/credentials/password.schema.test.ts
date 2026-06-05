import { describe, expect, it } from 'vitest'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordSchema } from './password.schema'

describe('passwordSchema', () => {
  it('принимает пароль ровно на минимуме', () => {
    const result = passwordSchema.safeParse('a'.repeat(PASSWORD_MIN_LENGTH))
    expect(result.success).toBe(true)
  })

  it('отклоняет пароль короче минимума', () => {
    const result = passwordSchema.safeParse('a'.repeat(PASSWORD_MIN_LENGTH - 1))
    expect(result.success).toBe(false)
  })

  it('принимает пароль ровно на максимуме', () => {
    const result = passwordSchema.safeParse('a'.repeat(PASSWORD_MAX_LENGTH))
    expect(result.success).toBe(true)
  })

  it('отклоняет пароль длиннее максимума', () => {
    const result = passwordSchema.safeParse('a'.repeat(PASSWORD_MAX_LENGTH + 1))
    expect(result.success).toBe(false)
  })

  it('НЕ требует uppercase / digit / special (NIST)', () => {
    const result = passwordSchema.safeParse('aaaaaaaaaaaa')
    expect(result.success).toBe(true)
  })

  it('принимает пароль с пробелами и спецсимволами', () => {
    const result = passwordSchema.safeParse('correct horse battery staple')
    expect(result.success).toBe(true)
  })
})
