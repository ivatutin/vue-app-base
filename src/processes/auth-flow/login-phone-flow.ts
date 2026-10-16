import { signInPhone, useAuthStore } from '@/entities/auth'
import { phoneSchema } from '@/shared/model/phone'
import { establishSession } from './establish-session'

/**
 * Вход по телефону — Phase 2.
 *
 * `verificationToken` получен OTP-каналом с `purpose: 'sign-in'`; `sign-in/phone` отдаёт
 * пару токенов — применяем её и завершаем вход общим финалом (`establishSession`).
 *
 * Anti-enumeration на стороне бэкенда: незарегистрированный номер даёт
 * `401 InvalidCredentials` (страница показывает единый текст, как и для неверного кода).
 */
export async function loginPhoneFlow (phone: string, verificationToken: string): Promise<void> {
  const pair = await signInPhone(phoneSchema.parse(phone), verificationToken)

  useAuthStore().applyTokenPair(pair)
  await establishSession()
}
