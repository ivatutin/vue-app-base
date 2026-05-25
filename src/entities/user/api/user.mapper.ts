import { phoneSchema } from '@/shared/model/phone'
import type { UserDto } from './user.dto'
import type { User } from '../schema/user.schema'

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    phone: dto.phone === null ? null : phoneSchema.parse(dto.phone),
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
