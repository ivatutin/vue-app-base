import { z } from 'zod'

export const userStatusDtoSchema = z.enum([
  'pending_verification',
  'active',
  'suspended',
  'deleted',
])

export const userDtoSchema = z.object({
  id: z.uuid(),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  roles: z.array(z.string()).default([]),
  status: userStatusDtoSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserDto = z.infer<typeof userDtoSchema>

/**
 * Тело `PATCH /users/:id/profile`. Как и бэкенд, требуем хотя бы одно поле:
 * `null` — очистить значение, отсутствие ключа — не трогать. Строки не обрезаем
 * здесь: нормализацию делает форма (`''` → `null`).
 */
export const updateProfileBodyDtoSchema = z
  .object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
  })
  .refine(data => data.firstName !== undefined || data.lastName !== undefined, {
    message: 'At least one field must be provided',
  })

export type UpdateProfileBodyDto = z.infer<typeof updateProfileBodyDtoSchema>
