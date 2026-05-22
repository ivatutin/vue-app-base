import { userDtoSchema } from './user.dto'
import { toUser } from './user.mapper'
import type { User } from '../schema/user.schema'

export async function getCurrentUser(): Promise<User> {
    console.log('getCurrentUser')
    const parsed = userDtoSchema.safeParse({
        id: '1',
        email: 'zx@zx.sz',
        phone: '+79991234567',
        full_name: 'SuperUsedr',
        roles: ['admin'],
        permissions: ['user.read', 'user.update',  'user.delete',  'role.manage'],
        is_active: true,
        created_at: new Date()
    })
    if (!parsed.success) {
        return Promise.reject(parsed.error);
    }
    return toUser(parsed.data);
}

export async function logoutRequest(): Promise<void> {
  return Promise.resolve()
}
