import type { User } from '../schema/user.schema'
import type { UserDto } from './user.dto'
import { phoneSchema } from '@/shared/model/phone'

/**
 * Телефон из БД может не пройти валидацию (легаси-записи, ручные
 * правки, формат вроде `89991234567` без нормализации). Раньше здесь
 * стоял голый `.parse` — и такой пользователь не мог войти вообще:
 * ZodError валил bootstrap целиком.
 *
 * Некорректный номер — не повод отказать в доступе к приложению.
 * Отдаём `null` и пишем в консоль; профиль подскажет заполнить заново.
 */
function parsePhone (raw: string): User['phone'] {
  const result = phoneSchema.safeParse(raw)

  if (!result.success) {
    console.warn('[user.mapper] некорректный телефон в профиле, игнорируем', result.error.issues)
    return null
  }

  return result.data
}

export function toUser (dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    phone: dto.phone === null ? null : parsePhone(dto.phone),
    emailVerified: dto.emailVerified,
    phoneVerified: dto.phoneVerified,
    firstName: dto.firstName,
    lastName: dto.lastName,
    roles: dto.roles,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}
