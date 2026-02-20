import { z } from 'zod'
import { normalizePhone } from './phone.lib'

/**
 * E.164 phone format
 * +79991234567
 */
const E164_REGEX = /^\+[1-9]\d{9,14}$/

export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .transform(normalizePhone)
  .refine((value) => E164_REGEX.test(value), {
    message: 'Invalid phone format',
  })
  .brand<'Phone'>()


export type Phone = z.infer<typeof phoneSchema>

