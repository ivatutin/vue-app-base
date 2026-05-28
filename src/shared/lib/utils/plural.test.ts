import { describe, expect, it } from 'vitest'
import { plural } from './plural'

const FORMS = ['яблоко', 'яблока', 'яблок'] as const

describe('plural', () => {
  it('единственное число (1, 21, 101)', () => {
    expect(plural(1, FORMS)).toBe('яблоко')
    expect(plural(21, FORMS)).toBe('яблоко')
    expect(plural(101, FORMS)).toBe('яблоко')
  })

  it('единицы 2-4 (2, 23, 104)', () => {
    expect(plural(2, FORMS)).toBe('яблока')
    expect(plural(3, FORMS)).toBe('яблока')
    expect(plural(4, FORMS)).toBe('яблока')
    expect(plural(23, FORMS)).toBe('яблока')
    expect(plural(104, FORMS)).toBe('яблока')
  })

  it('пятёрки и нули (0, 5-20, 25, 100)', () => {
    expect(plural(0, FORMS)).toBe('яблок')
    expect(plural(5, FORMS)).toBe('яблок')
    expect(plural(11, FORMS)).toBe('яблок')
    expect(plural(12, FORMS)).toBe('яблок')
    expect(plural(20, FORMS)).toBe('яблок')
    expect(plural(25, FORMS)).toBe('яблок')
    expect(plural(100, FORMS)).toBe('яблок')
  })

  it('возвращает пустую строку для индекса вне titles (защитный fallback)', () => {
    expect(plural(1, [] as readonly string[])).toBe('')
  })
})
