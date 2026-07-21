import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Страж публичного API UI-кита.
 *
 * Слайс с собственным `index.ts` — это заявка на публичность. Если его
 * забыли добавить в barrel, компонент существует, но недостижим
 * штатным импортом: потребители либо не узнают о нём, либо полезут
 * вглубь слоя в обход `index.ts` (запрещено CONTRIBUTING).
 *
 * Ровно так и вышло с компонентами M0.B: `OtpInput`, `PasswordInput`,
 * `PhoneInput` и `Tabs` были написаны, покрыты тестами — и четыре
 * коммита пролежали недоступными из `@/shared/ui/base`.
 */

const BASE_DIR = path.join(process.cwd(), 'src/shared/ui/base')

/**
 * Внутренние примитивы слоя: осознанно не в публичном API.
 * Обоснование каждого — в комментарии к `index.ts`.
 */
const INTENTIONALLY_INTERNAL = new Set(['input', 'label', 'popover'])

const barrel = readFileSync(path.join(BASE_DIR, 'index.ts'), 'utf8')
const exportedSlices = new Set(
  [...barrel.matchAll(/from '\.\/([a-z-]+)'/g)].map(m => m[1]!),
)

const slices = readdirSync(BASE_DIR)
  .filter(name => statSync(path.join(BASE_DIR, name)).isDirectory())
  .filter(name => {
    try {
      return statSync(path.join(BASE_DIR, name, 'index.ts')).isFile()
    } catch {
      return false
    }
  })

describe('shared/ui/base — публичный API', () => {
  it('слайсы вообще найдены (иначе тест бессмысленный)', () => {
    expect(slices.length).toBeGreaterThan(10)
  })

  it.each(slices)('слайс %s либо экспортирован, либо помечен внутренним', slice => {
    const isPublic = exportedSlices.has(slice)
    const isInternal = INTENTIONALLY_INTERNAL.has(slice)

    expect(
      isPublic || isInternal,
      `Слайс «${slice}» имеет index.ts, но не экспортирован из barrel. Добавь его в src/shared/ui/base/index.ts либо, если это внутренний примитив, — в INTENTIONALLY_INTERNAL с обоснованием в комментарии к barrel.`,
    ).toBe(true)

    expect(
      isPublic && isInternal,
      `Слайс «${slice}» одновременно экспортирован и помечен внутренним — противоречие.`,
    ).toBe(false)
  })

  it('в списке внутренних нет исчезнувших слайсов', () => {
    for (const internal of INTENTIONALLY_INTERNAL) {
      expect(
        slices,
        `«${internal}» помечен внутренним, но такого слайса больше нет — почисти список.`,
      ).toContain(internal)
    }
  })

  it('компоненты M0.B доступны через barrel', () => {
    // Отдельной проверкой, потому что именно они были потеряны.
    for (const name of ['OtpInput', 'PasswordInput', 'PhoneInput', 'Tabs']) {
      expect(barrel, `${name} должен экспортироваться из @/shared/ui/base`).toContain(name)
    }
  })
})
