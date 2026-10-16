import type { Phone } from '@/shared/model/phone'
import { signUpPhone, useAuthStore } from '@/entities/auth'

import { phoneSchema } from '@/shared/model/phone'
import { establishSession } from './establish-session'

export interface RegisterPhoneInput {
  phone: string
  verificationToken: string
  acceptedTerms: boolean
  firstName?: string
  lastName?: string
}

/**
 * Регистрация по телефону — Phase 2.
 *
 * `verificationToken` получен OTP-каналом (`purpose: 'sign-up'`); `sign-up/phone` сразу
 * отдаёт пару токенов, поэтому флоу применяет её и завершает вход общим финалом
 * (`establishSession`) — иначе пользователь остался бы «зарегистрирован, но не в системе».
 *
 * Ошибки не глушим (`409 ContactAlreadyExists`, `422 VerificationToken*`): страница
 * показывает их по коду через `matchError`.
 */
export async function registerPhoneFlow (input: RegisterPhoneInput): Promise<void> {
  const phone: Phone = phoneSchema.parse(input.phone)

  const pair = await signUpPhone({
    phone,
    verificationToken: input.verificationToken,
    acceptedTerms: input.acceptedTerms,
    firstName: input.firstName,
    lastName: input.lastName,
  })

  useAuthStore().applyTokenPair(pair)
  await establishSession()
}
