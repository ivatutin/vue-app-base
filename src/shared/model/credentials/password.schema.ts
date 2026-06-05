import { z } from 'zod'

/**
 * Политика пароля по NIST SP 800-63B (синхронизировано с Keycloak realm
 * `length(12)` — см. ADR-0013):
 *
 * - минимум 12 символов
 * - максимум 128 символов (DoS-защита от длинных хешей)
 * - НЕ требуем uppercase/lowercase/digit/special — NIST явно против
 *   композиционных правил, они снижают энтропию (пользователь добавляет
 *   `!1` в конец и думает что усилил)
 * - blocklist слабых паролей и HIBP — на стороне backend (Keycloak)
 *
 * Реальная валидация (включая HIBP) живёт на backend — frontend ловит
 * `422 PasswordPolicyViolation` через ErrorCode.
 */
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Минимум ${PASSWORD_MIN_LENGTH} символов`)
  .max(PASSWORD_MAX_LENGTH, `Максимум ${PASSWORD_MAX_LENGTH} символов`)

export type Password = z.infer<typeof passwordSchema>
