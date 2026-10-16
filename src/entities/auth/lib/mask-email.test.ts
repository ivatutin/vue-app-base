import { describe, expect, it } from 'vitest'
import { maskEmail } from './mask-email'

describe('maskEmail', () => {
  it('оставляет первую букву локальной части и домен', () => {
    expect(maskEmail('user@example.com')).toBe('u***@example.com')
  })

  it('работает на однобуквенной локальной части', () => {
    expect(maskEmail('a@b.co')).toBe('a***@b.co')
  })

  it('работает на многоточечных локальных частях', () => {
    expect(maskEmail('ivan.petrov+tag@example.org')).toBe('i***@example.org')
  })

  it('не ломается на строке без @ и на пустой', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email')
    expect(maskEmail('')).toBe('')
    expect(maskEmail('@example.com')).toBe('@example.com')
  })
})
