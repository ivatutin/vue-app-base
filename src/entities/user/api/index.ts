import { userDtoSchema } from './user.dto'
import { toUser } from './user.mapper'
import type { User } from '../schema/user.schema'

export async function getCurrentUser(): Promise<User> {
  // TODO (фаза 1.6): подключить getHttpClient().get<unknown>('/users/me').
  // Пока — мок в формате UserResponseDto бэка njs-server.
  const parsed = userDtoSchema.safeParse({
    id: '00000000-0000-4000-8000-000000000001',
    email: 'zx@zx.sz',
    phone: '+79991234567',
    emailVerified: true,
    phoneVerified: true,
    firstName: 'Super',
    lastName: 'User',
    roles: ['admin'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  if (!parsed.success) {
    return Promise.reject(parsed.error)
  }
  return toUser(parsed.data)
}

export async function logoutRequest(): Promise<void> {
  return Promise.resolve()
}
