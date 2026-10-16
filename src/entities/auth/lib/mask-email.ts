/**
 * Маскирование email для показа на экране подтверждения: видно домен и первую
 * букву локальной части (`user@example.com` → `u***@example.com`).
 *
 * Логика та же, что у бэкенда для телефона (`+7 (***) ***-12-34`): пользователю
 * достаточно узнать «свой» адрес, а целиком он в UI не нужен.
 */
export function maskEmail (email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) {
    return email
  }

  const local = email.slice(0, at)
  const domain = email.slice(at)
  const head = local.slice(0, 1)

  return `${head}***${domain}`
}
