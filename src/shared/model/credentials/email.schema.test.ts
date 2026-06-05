import { describe, expect, it } from 'vitest'
import { emailSchema } from './email.schema'

describe('emailSchema', () => {
  it('принимает валидный email', () => {
    const result = emailSchema.safeParse('user@example.com')
    expect(result.success).toBe(true)
    expect(result.data).toBe('user@example.com')
  })

  it('нормализует регистр в lowercase', () => {
    const result = emailSchema.safeParse('User@Example.COM')
    expect(result.success).toBe(true)
    expect(result.data).toBe('user@example.com')
  })

  it('обрезает пробелы', () => {
    const result = emailSchema.safeParse('  user@example.com  ')
    expect(result.success).toBe(true)
    expect(result.data).toBe('user@example.com')
  })

  it('отклоняет невалидный email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
    expect(emailSchema.safeParse('user@').success).toBe(false)
    expect(emailSchema.safeParse('@example.com').success).toBe(false)
  })

  it('отклоняет пустую строку', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})
