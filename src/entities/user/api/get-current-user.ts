import type { User } from '../schema/user.schema'
import { getHttpClient } from '@/shared/api'
import { userDtoSchema } from './user.dto'
import { toUser } from './user.mapper'

export async function getCurrentUser (): Promise<User> {
  const raw = await getHttpClient().get<unknown>('/users/me')
  const parsed = userDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }
  return toUser(parsed.data)
}
