import { isValidPhoneNumber } from 'libphonenumber-js'
import { z } from 'zod'
import { normalizePhone } from './phone.lib'

/**
 * Валидность проверяет libphonenumber-js, а не regex по длине.
 *
 * Прежний `/^\+[1-9]\d{9,14}$/` пропускал любые 10-15 цифр подряд,
 * то есть считал валидным **недонабранный** российский номер:
 * `+7999123456` (не хватает одной цифры) проходил проверку и уезжал
 * на бэкенд. Заодно пропускались несуществующие коды (`+70000000000`)
 * и номера с лишними цифрами.
 *
 * libphonenumber знает реальные планы нумерации по странам, поэтому
 * отвечает на вопрос «существует ли такой номер», а не «похоже ли это
 * на телефон». Пакет уже в зависимостях — им же сделана маска
 * в `<PhoneInput>`.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Укажите номер телефона')
  .transform(normalizePhone)
  .refine(value => isValidPhoneNumber(value), {
    message: 'Некорректный номер телефона',
  })
  .brand<'Phone'>()

export type Phone = z.infer<typeof phoneSchema>
