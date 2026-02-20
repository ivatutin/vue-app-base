import { userSchema } from "../schema/user.schema"
import type { User } from "../index"

export async function getCurrentUser(): Promise<User> {
    console.log('getCurrentUser')
    const res = userSchema.safeParse({
        id: '1',
        email: 'zx@zx.sz',
        phone: '+79991234567',
        full_name: 'SuperUsedr',
        roles: ['admin'],
        permissions: ['user.read', 'user.update',  'user.delete',  'role.manage'],
        is_active: true,
        created_at: new Date()
    })
    if (!res.success) {
        return Promise.reject(res.error);
    } else {
        return Promise.resolve(res.data);
    }
}

export async function logoutRequest(): Promise<void> {
  return Promise.resolve()
}