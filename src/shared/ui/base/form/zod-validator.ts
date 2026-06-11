import type { TypedSchema } from 'vee-validate'
import type { z } from 'zod'

/**
 * Адаптер Zod 4 → vee-validate TypedSchema.
 *
 * Почему не `@vee-validate/zod` / `toTypedSchema`: пакет @vee-validate/zod
 * прибит к Zod 3 на уровне peerDeps и читает внутреннюю структуру Zod-
 * schema (def.shape / _zod). Zod 4 поменял внутренности — `toTypedSchema`
 * крашится в runtime (`'get' on proxy: property '_zod' is read-only`).
 *
 * Этот адаптер реализует тот же интерфейс TypedSchema («__type:
 * VVTypedSchema» + parse + cast), но опирается только на публичный
 * `safeParseAsync` Zod — совместим и с 3, и с 4.
 *
 * vee-validate validationSchema принимает либо Yup-like object, либо
 * TypedSchema. Если передать просто функцию (`(values) => errors`), это
 * молча игнорируется — поэтому обязателен этот интерфейс.
 */
export function buildZodValidator<TSchema extends z.ZodObject<z.ZodRawShape>> (
  schema: TSchema,
): TypedSchema<z.input<TSchema>, z.output<TSchema>> {
  return {
    __type: 'VVTypedSchema',
    async parse (values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) {
        return { value: result.data, errors: [] }
      }

      const byPath = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join('.')
        const list = byPath.get(path) ?? []
        list.push(issue.message)
        byPath.set(path, list)
      }
      return {
        value: undefined,
        errors: Array.from(byPath.entries()).map(([path, errors]) => ({ path, errors })),
      }
    },
    cast (values) {
      // vee-validate использует cast для initial values; мы не делаем
      // дефолтных подстановок — возвращаем values как есть
      return values as z.input<TSchema>
    },
  }
}
