import { z } from 'zod'

/**
 * Политика пароля — **сверена с живым реалмом `app`** (16.10.2026):
 * `length(10) and notUsername and notEmail`.
 *
 * - минимум 10 символов (раньше здесь стояло 12 — фронт был строже бэкенда и
 *   отклонял пароли, которые Keycloak принял бы; истина — за реалмом);
 * - максимум 128 символов (DoS-защита от длинных хешей);
 * - НЕ требуем uppercase/lowercase/digit/special — NIST SP 800-63B против
 *   композиционных правил, они снижают энтропию (пользователь добавляет
 *   `!1` в конец и думает что усилил);
 * - `notUsername` для пользователя недостижим (логин в Keycloak — генерируемый
 *   handle, ADR-0017 ред. 2), а `notEmail` проверяется кросс-полевым правилом
 *   формы регистрации — в эту схему email не приходит.
 *
 * Реальная валидация (blocklist, HIBP) живёт на backend — frontend ловит
 * `422 PasswordPolicyViolation` через ErrorCode и показывает свой текст.
 */
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Минимум ${PASSWORD_MIN_LENGTH} символов`)
  .max(PASSWORD_MAX_LENGTH, `Максимум ${PASSWORD_MAX_LENGTH} символов`)

export type Password = z.infer<typeof passwordSchema>
