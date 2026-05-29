import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().min(1, 'VITE_API_URL is required'),
  // Какая реализация shared/ui/base/ обёрток рендерится в runtime.
  // Используется во время Фазы 2.7 миграции (ADR-0007). Default
  // переключён на 'shadcn' (Шаг 2.7.13); флаг удалится в Шаге 2.7.14
  // вместе с *.vuetify.vue файлами.
  VITE_UI_IMPL: z.enum(['vuetify', 'shadcn']).default('shadcn'),
})

const parsed = envSchema.safeParse(import.meta.env)
if (!parsed.success) {
  const issues = parsed.error.issues
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ')
  throw new Error(`Invalid environment configuration. ${issues}`)
}

export const env = parsed.data
export type Env = z.infer<typeof envSchema>
