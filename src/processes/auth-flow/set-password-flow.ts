import { setPassword } from '@/entities/auth'

/**
 * Задать пароль аккаунту, у которого его нет (phone sign-up) — Phase 4.
 *
 * `verificationToken` приходит из OTP- или звонкового канала с
 * `purpose: 'set-password'` и привязан к **собственному** контакту пользователя:
 * токен, выданный на чужой номер, бэкенд отвергает. Наружу токен не возвращается и
 * в сторах не хранится — одноразовый секрет (ADR-0011).
 *
 * Сессия не меняется: ответ `204`, текущие токены продолжают работать.
 */
export async function setPasswordFlow (
  verificationToken: string,
  newPassword: string,
): Promise<void> {
  await setPassword(verificationToken, newPassword)
}
