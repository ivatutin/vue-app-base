import { z } from 'zod'

export const tokenPairDtoSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
})

export type TokenPairDto = z.infer<typeof tokenPairDtoSchema>
