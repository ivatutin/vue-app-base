import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Автомат под два жёстких правила из CONTRIBUTING § Правила импортов.
 * Дисциплина держится на человеке ровно до третьего месяца — ADR-0001
 * сам себе это предсказал.
 *
 * Полноценная замена — `eslint-plugin-boundaries` (ROADMAP, Фаза 2).
 * До неё этот тест закрывает те нарушения, что реально случались:
 * deep-import в обход barrel'а, импорт соседнего слайса и цикл через
 * собственный barrel.
 */

const SRC = path.join(process.cwd(), 'src')

/** Слои, поделённые на слайсы. `shared` устроен сегментами — правила иные. */
const SLICED_LAYERS = new Set(['entities', 'features', 'widgets', 'processes', 'pages'])

function walk (dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, acc)
    } else if (/\.(ts|vue)$/.test(entry) && !/\.(test|spec)\.ts$/.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}

/**
 * Комментарии вырезаем: в JSDoc намеренно показывают импорт со стороны
 * ПОТРЕБИТЕЛЯ, и для него `@/entities/user` — правильный путь.
 */
function stripComments (source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

interface ImportRef {
  file: string
  spec: string
}

const files = walk(SRC)
const imports: ImportRef[] = []

for (const file of files) {
  const source = stripComments(readFileSync(file, 'utf8'))
  for (const match of source.matchAll(/from\s+'(@\/[^']+)'/g)) {
    imports.push({ file: path.relative(process.cwd(), file).split('\\').join('/'), spec: match[1]! })
  }
}

/** `@/entities/user/api/x` → { layer: 'entities', slice: 'user', rest: 'api/x' } */
function parse (spec: string) {
  const [, layer, slice, ...rest] = spec.split('/')
  return { layer, slice, rest: rest.join('/') }
}

describe('правила импортов FSD', () => {
  it('импорты вообще найдены (иначе тест бессмысленный)', () => {
    expect(imports.length).toBeGreaterThan(50)
  })

  it('никто не импортирует внутренности слайса в обход index.ts', () => {
    const violations = imports.filter(({ spec }) => {
      const { layer, rest } = parse(spec)
      return SLICED_LAYERS.has(layer!) && rest !== ''
    })

    expect(
      violations.map(v => `${v.file} → ${v.spec}`),
      'Слайс отдаёт наружу только то, что в его index.ts. Внутренняя структура (ui/model/api/lib) может меняться без оповещения — deep-import превращает путь к файлу в контракт.',
    ).toEqual([])
  })

  it('слайс не импортирует соседний слайс того же слоя', () => {
    const violations = imports.filter(({ file, spec }) => {
      const target = parse(spec)
      if (!SLICED_LAYERS.has(target.layer!)) {
        return false
      }

      const [, fileLayer, fileSlice] = file.split('/')
      return fileLayer === target.layer && fileSlice !== target.slice
    })

    expect(
      violations.map(v => `${v.file} → ${v.spec}`),
      'Совместная работа двух сущностей оркеструется в processes/ или features/, иначе слой превращается в граф вместо дерева (ADR-0001).',
    ).toEqual([])
  })

  it('слайс не импортирует собственный barrel (рантайм-цикл)', () => {
    const violations = imports.filter(({ file, spec }) => {
      const target = parse(spec)
      const [, fileLayer, fileSlice] = file.split('/')
      return fileLayer === target.layer && fileSlice === target.slice
    })

    expect(
      violations.map(v => `${v.file} → ${v.spec}`),
      'Цикл index.ts → внутренний файл → index.ts. Не взрывается только пока обращение к импорту отложено до вызова функции. Импортируй соседний сегмент относительным путём.',
    ).toEqual([])
  })

  it('нижние слои не знают про верхние', () => {
    /**
     * Порядок из CONTRIBUTING: `processes` стоит ниже `pages`, потому
     * что страницы дёргают сценарии (`LoginPage` → `loginFlow`),
     * а не наоборот.
     */
    const ORDER = ['shared', 'entities', 'features', 'widgets', 'processes', 'pages', 'app']
    const rank = (layer: string) => ORDER.indexOf(layer)

    const violations = imports.filter(({ file, spec }) => {
      const [, fileLayer] = file.split('/')
      const { layer: targetLayer } = parse(spec)
      const from = rank(fileLayer!)
      const to = rank(targetLayer!)
      if (from === -1 || to === -1) {
        return false
      }
      return to > from
    })

    expect(
      violations.map(v => `${v.file} → ${v.spec}`),
      'Слой может импортировать только из нижних: shared → entities → features → widgets → pages → app.',
    ).toEqual([])
  })
})
