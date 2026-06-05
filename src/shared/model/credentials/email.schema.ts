import { z } from 'zod'

/**
 * Email с нормализацией: trim + lowercase.
 *
 * RFC 5321 формально требует case-sensitive local-part, но почти все
 * провайдеры (Gmail, Yandex, корпоративные Exchange) обрабатывают регистр
 * без учёта. Lower-case на входе устраняет дубли вида `User@x.ru` vs
 * `user@x.ru`.
 *
 * brand 'Email' маркирует уже нормализованное значение — backend/storage
 * сравнивает email только в этом виде.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Некорректный email'))
  .brand<'Email'>()

export type Email = z.infer<typeof emailSchema>
