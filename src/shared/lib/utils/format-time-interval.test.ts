import { describe, expect, it } from 'vitest'
import { formatTimeInterval } from './format-time-interval'

describe('formatTimeInterval', () => {
  it('секунды', () => {
    expect(formatTimeInterval(5)).toBe('5 сек')
    expect(formatTimeInterval(45)).toBe('45 сек')
  })

  it('минуты и секунды', () => {
    expect(formatTimeInterval(125)).toBe('2 мин 5 сек')
  })

  it('часы, минуты и секунды', () => {
    // 1ч 1мин 1сек = 3661 секунд
    expect(formatTimeInterval(3661)).toBe('1 час 1 мин 1 сек')
  })

  it('дни', () => {
    // 2 дня = 172800 секунд
    expect(formatTimeInterval(172_800)).toBe('2 дня')
  })

  it('shortFormat короткие суффиксы по unit', () => {
    expect(formatTimeInterval(3661, true)).toBe('1ч 1м 1с')
  })

  it('фильтрует нулевые единицы', () => {
    // 1 час ровно — без минут и секунд
    expect(formatTimeInterval(3600)).toBe('1 час')
  })

  it('0 секунд = пустая строка', () => {
    expect(formatTimeInterval(0)).toBe('')
  })
})
