import { getHttpClient } from '@/shared/api'
import { userDtoSchema } from './user.dto'
import { toUser } from './user.mapper'
import type { User } from '../schema/user.schema'

export async function getCurrentUser(): Promise<User> {
  const client = getHttpClient()
  const raw = await client.get<unknown>('/users/me')
  const parsed = userDtoSchema.safeParse(raw)
  if (!parsed.success) return Promise.reject(parsed.error)
  return toUser(parsed.data)
}
