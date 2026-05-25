import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().min(1, 'VITE_API_URL is required'),
})

const parsed = envSchema.safeParse(import.meta.env)
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ')
  throw new Error(`Invalid environment configuration. ${issues}`)
}

export const env = parsed.data
export type Env = z.infer<typeof envSchema>
