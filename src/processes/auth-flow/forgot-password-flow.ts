import { forgotPassword } from '@/entities/auth'

import { emailSchema } from '@/shared/model/credentials'

/**
 * «Забыли пароль» — Phase 1.5.
 *
 * Бэкенд отвечает `202` независимо от того, существует адрес или нет
 * (anti-enumeration), поэтому флоу никак не сигнализирует о существовании аккаунта:
 * страница просто переключается в состояние «письмо отправлено». Ошибки (сеть, 5xx)
 * пробрасываем — их страница показывает.
 *
 * Своей формы нового пароля у нас нет: пользователь задаёт его на странице Keycloak
 * (required action `UPDATE_PASSWORD`).
 */
export async function forgotPasswordFlow (email: string): Promise<void> {
  await forgotPassword(emailSchema.parse(email))
}
