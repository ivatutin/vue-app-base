import { resendVerifyEmail, useRegistrationStore } from '@/entities/auth'

import { emailSchema } from '@/shared/model/credentials'

/**
 * Повторная отправка письма-подтверждения.
 *
 * Адрес берём из `registration-store`; после перезагрузки страницы его там нет —
 * тогда вызывающий передаёт email вручную (экран подтверждения умеет спросить).
 *
 * Бэкенд отвечает `202` всегда (anti-enumeration: не выдаёт, существует ли адрес),
 * поэтому результата для UI нет — успех выражается отсутствием ошибки, а в сторе
 * помечаем «письмо отправлено», чтобы погасить подсказку «письмо не ушло».
 */
export async function resendVerifyEmailFlow (email?: string): Promise<void> {
  const store = useRegistrationStore()
  const source = email ?? store.pendingEmail

  if (!source) {
    throw new Error('No email to resend verification to')
  }

  const target = emailSchema.parse(source)
  await resendVerifyEmail(target)

  // Адрес могли ввести вручную (стор после перезагрузки пуст) — запоминаем,
  // чтобы экран дальше показывал маску, а не поле ввода.
  store.setPendingEmail(target)
  store.markResent()
}
