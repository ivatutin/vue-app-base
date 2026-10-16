import { signUpEmail, useRegistrationStore } from '@/entities/auth'
import { ErrorCode, matchError } from '@/shared/api'

import { emailSchema, passwordSchema } from '@/shared/model/credentials'

export interface RegisterEmailInput {
  email: string
  password: string
  acceptedTerms: boolean
  firstName?: string
  lastName?: string
}

/**
 * Регистрация по email — шаг Phase 1.
 *
 * Форма уже проверила поля своей схемой; здесь значения ещё раз приводятся к
 * brand-типам (`Email`, `Password`) — на границе с API это единственное место
 * нормализации. `acceptedTerms` обязан быть `true` (в схеме формы это
 * `z.literal(true)`, проверка здесь — страховка от кривого вызова).
 *
 * Токенов `sign-up/email` **не отдаёт** — вход выполняется после подтверждения
 * (вариант A), поэтому флоу запоминает адрес в `registration-store` и отдаёт
 * «письмо отправлено?» (`false` — бэкенд не упал, но письмо не ушло).
 *
 * Ошибки не глушим: `409 ContactAlreadyExists` дополнительно помечаем в сторе,
 * чтобы экран подтверждения объяснил ситуацию и предложил resend.
 */
export async function registerEmailFlow (input: RegisterEmailInput): Promise<boolean> {
  const email = emailSchema.parse(input.email)
  const password = passwordSchema.parse(input.password)

  if (input.acceptedTerms !== true) {
    throw new Error('Terms are not accepted')
  }

  try {
    const sent = await signUpEmail({
      email,
      password,
      acceptedTerms: true,
      firstName: input.firstName,
      lastName: input.lastName,
    })

    useRegistrationStore().rememberSignUp(email, sent)
    return sent
  } catch (error) {
    if (matchError(error, ErrorCode.CONTACT_ALREADY_EXISTS)) {
      useRegistrationStore().rememberConflict(email)
    }
    throw error
  }
}
