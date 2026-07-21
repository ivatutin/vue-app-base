import { describe, expect, it } from 'vitest'
import { phoneSchema } from './phone.schema'

describe('phoneSchema', () => {
  it('принимает полный российский номер в любом формате ввода', () => {
    for (const input of ['+79991234567', '89991234567', '9991234567', '8 (999) 123-45-67']) {
      const result = phoneSchema.safeParse(input)
      expect(result.success, input).toBe(true)
      expect(result.data).toBe('+79991234567')
    }
  })

  it('принимает валидный иностранный номер', () => {
    expect(phoneSchema.safeParse('+4930123456').success).toBe(true)
  })

  /**
   * Раньше здесь стоял regex `/^\+[1-9]\d{9,14}$/` — «10-15 цифр после
   * плюса». Он пропускал недонабранные и несуществующие номера,
   * потому что проверял форму, а не существование.
   */
  describe('отклоняет то, что пропускал regex по длине', () => {
    it('недонабранный российский номер', () => {
      expect(phoneSchema.safeParse('+7999123456').success).toBe(false)
    })

    it('несуществующий код оператора', () => {
      expect(phoneSchema.safeParse('+70000000000').success).toBe(false)
    })

    it('лишние цифры', () => {
      expect(phoneSchema.safeParse('+79991234567890').success).toBe(false)
    })
  })

  it('отклоняет пустое значение и мусор', () => {
    for (const input of ['', '   ', 'не телефон', '+']) {
      expect(phoneSchema.safeParse(input).success, input).toBe(false)
    }
  })

  it('сообщения об ошибке на русском', () => {
    const result = phoneSchema.safeParse('+7999123456')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Некорректный номер телефона')
  })
})
