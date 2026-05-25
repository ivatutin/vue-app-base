import { getHttpClient, HttpError } from '@/shared/api'
import { tokenPairDtoSchema, type TokenPairDto } from './auth.dto'

export type TokenPair = TokenPairDto

export async function signIn(email: string, password: string): Promise<TokenPair> {
  const client = getHttpClient()
  const raw = await client.post<unknown>(
    '/auth/sign-in',
    { email, password },
    { auth: false },
  )
  return parse(raw)
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const client = getHttpClient()
  const raw = await client.post<unknown>(
    '/auth/refresh',
    { refreshToken },
    { auth: false },
  )
  return parse(raw)
}

export async function signOut(refreshToken: string): Promise<void> {
  const client = getHttpClient()
  try {
    await client.post<void>('/auth/sign-out', { refreshToken })
  } catch (err) {
    // 401 при истёкшем access — нормально, локальную сессию всё равно
    // очищаем; всё, кроме 401, пробрасываем наверх.
    if (!(err instanceof HttpError) || err.status !== 401) throw err
  }
}

function parse(raw: unknown): TokenPair {
  const result = tokenPairDtoSchema.safeParse(raw)
  if (!result.success) throw result.error
  return result.data
}
