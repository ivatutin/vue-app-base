import { changePassword, requestReauth } from '@/entities/auth'

/**
 * Смена пароля — два обязательных шага, второй без первого не пройдёт.
 *
 * 1. `POST /auth/reauth` подтверждает **текущий** пароль и выдаёт одноразовый
 *    `reauthToken` (~5 минут). Неверный пароль → `401 InvalidCredentials`, и до
 *    второго шага дело не доходит — UI показывает ошибку у поля «текущий пароль».
 * 2. `POST /users/me/password` с `X-Reauth-Token` ставит новый пароль (`204`).
 *
 * Токен живёт только в замыкании флоу: наружу не отдаётся и в сторе не хранится —
 * это одноразовый секрет на одну операцию (ср. `verificationToken`, ADR-0011).
 * Текущая сессия сохраняется: бэкенд при смене пароля её не отзывает, отзыв всех
 * устройств — отдельная операция (`logoutAllFlow`).
 */
export async function changePasswordFlow (
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { reauthToken } = await requestReauth(currentPassword)
  await changePassword(reauthToken, newPassword)
}
