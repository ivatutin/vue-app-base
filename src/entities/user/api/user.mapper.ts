import { phoneSchema } from '@/shared/model/phone'
import type { UserDto } from './user.dto'
import type { User } from '../schema/user.schema'

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    fullName: dto.full_name,
    phone: phoneSchema.parse(dto.phone),
    email: dto.email,
    roles: dto.roles,
    permissions: dto.permissions,
    isActive: dto.is_active,
    createdAt: dto.created_at,
  }
}
