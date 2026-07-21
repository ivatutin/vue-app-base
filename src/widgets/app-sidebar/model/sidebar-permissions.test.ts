import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { sidebarSections } from './sidebar-items'

/**
 * Инвариант безопасности: **если пункт меню скрыт по праву, маршрут
 * обязан это право проверять.**
 *
 * Иначе RBAC держится на том, что ссылку не видно, — а прямой ввод URL
 * или `router.push` из кода обходят его целиком. Именно так и было:
 * `sidebar-items.ts` фильтровался по `permission`, но `meta.permissions`
 * не был выставлен ни на одной странице.
 *
 * Проверка структурная (читаем исходник страницы), потому что
 * `definePage` — это макрос: до сборки его meta нигде не существует
 * как значение, а поднимать в юнит-тесте полный роутер с генератором
 * маршрутов дороже, чем польза.
 */

const ROOT = process.cwd()

/** Кандидаты по конвенциям проекта: FSD-слайс и плоский файл. */
function findPageSource (to: string): { file: string, source: string } | null {
  const slug = to.replace(/^\//, '')
  const pascal = slug
    .split(/[/-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const candidates = [
    `src/pages/${slug}/ui/${pascal}Page.vue`,
    `src/pages/${slug}.vue`,
    `src/pages/${slug}/index.vue`,
  ]

  for (const candidate of candidates) {
    const file = path.join(ROOT, candidate)
    if (existsSync(file)) {
      return { file: candidate, source: readFileSync(file, 'utf8') }
    }
  }

  return null
}

const allItems = sidebarSections.flatMap(section => section.items)
const guardedItems = allItems.filter(item => item.permission)

describe('sidebar ↔ маршруты', () => {
  it('в сайдбаре есть пункты, защищённые правами (иначе тест бессмысленный)', () => {
    expect(guardedItems.length).toBeGreaterThan(0)
  })

  it.each(allItems.map(item => [item.to, item.label] as const))(
    'пункт %s (%s) ведёт на существующую страницу',
    to => {
      const page = findPageSource(to)
      expect(
        page,
        `Пункт сайдбара ведёт на ${to}, но страницы нет — пользователь получит 404.`,
      ).not.toBeNull()
    },
  )

  it.each(guardedItems.map(item => [item.to, item.permission!] as const))(
    'маршрут %s требует право %s на уровне meta',
    (to, permission) => {
      const page = findPageSource(to)
      expect(page).not.toBeNull()

      const meta = page!.source.match(/permissions:\s*\[(.*?)]/s)
      expect(
        meta,
        `${page!.file}: пункт сайдбара скрыт по праву «${permission}», но definePage не объявляет meta.permissions. Прямой переход по URL обойдёт проверку.`,
      ).not.toBeNull()

      expect(
        meta![1],
        `${page!.file}: meta.permissions не содержит «${permission}» — сайдбар и guard разошлись.`,
      ).toContain(permission)
    },
  )
})
