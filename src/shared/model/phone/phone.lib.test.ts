import { describe, expect, it } from 'vitest'
import { normalizePhone } from './phone.lib'

describe('normalizePhone', () => {
  it('11-значный начинающийся с 8 → +7...', () => {
    expect(normalizePhone('89991234567')).toBe('+79991234567')
  })

  it('11-значный начинающийся с 7 → +7...', () => {
    expect(normalizePhone('79991234567')).toBe('+79991234567')
  })

  it('10-значный → +7...', () => {
    expect(normalizePhone('9991234567')).toBe('+79991234567')
  })

  it('убирает форматирование (пробелы, скобки, дефисы)', () => {
    expect(normalizePhone('8 (999) 123-45-67')).toBe('+79991234567')
    expect(normalizePhone('+7 999 123 45 67')).toBe('+79991234567')
  })

  it('сохраняет нестандартные коды стран как есть с +', () => {
    // Британский номер +44 7700 900123 → должен прийти +447700900123
    expect(normalizePhone('+44 7700 900123')).toBe('+447700900123')
  })
})
