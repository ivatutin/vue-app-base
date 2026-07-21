# Reference: команды

Все скрипты из [package.json](../../package.json).

## Разработка

### `npm run dev`

Vite dev-сервер на `http://localhost:3000` с HMR.

Порт задаётся в [vite.config.mts](../../vite.config.mts) (поле `server.port`).

При запуске `unplugin-vue-router` сканирует [src/pages/](../../src/pages/), генерирует роутер и [src/typed-router.d.ts](../../src/typed-router.d.ts). `unplugin-auto-import` обновляет [src/auto-imports.d.ts](../../src/auto-imports.d.ts).

## Сборка

### `npm run build`

Production-сборка. Запускает **последовательно** через `npm-run-all2` (`run-s`):

1. `type-check` (`vue-tsc --build --force`) — полная проверка типов.
2. `build-only` (`vite build`) — сама сборка.

Команда падает, если хотя бы одна из двух частей упала. Это правильно — нельзя катить непротипизированный код.

> **Почему последовательно, а не параллельно.** Раньше стоял `run-p`, и это была гонка: `vite build` перезаписывает `src/typed-router.d.ts` и `src/auto-imports.d.ts` ровно в тот момент, когда `vue-tsc` их читает. Источник плавающих «Cannot find name 'ref'» в CI. Последовательный запуск чуть медленнее, но детерминирован.

### `npm run build-only`

Только сборка, без `type-check`. Полезно, когда нужно быстро увидеть результат сборки в отрыве от типов. **В CI/проде используй `build`, не `build-only`.**

### `npm run type-check`

Только `vue-tsc --build --force`. Полезно перед PR в дополнение к lint.

### `npm run preview`

Запускает локальный сервер на собранном `dist/`. Используется для проверки production-бандла перед деплоем.

```bash
npm run build && npm run preview
```

## Качество кода

### `npm run lint`

`eslint . --fix`. Конфиг — [eslint.config.js](../../eslint.config.js), наследуется от `eslint-config-vuetify` (fork стандартных Vue/TS-конвенций, не привязан к Vuetify runtime — после Фазы 2.9 Vuetify в проекте нет).

Запускай **перед каждым PR**. Авто-фикс правит большую часть мелочей.

Поверх базового конфига на `src/**/*.{ts,vue}` включены **type-aware** правила (`projectService`): `no-floating-promises`, `no-misused-promises`, `await-thenable`. Они видят типы, поэтому ловят забытый `await` — класс ошибок, невидимый обычному линтеру и особенно опасный в async-bootstrap, refresh-мьютексе и auth-flow. Проверка чуть медленнее, поэтому не распространяется на конфиги и stories.

### `npm run lint:check`

То же самое **без** `--fix`. Для CI: там авто-правка бессмысленна (изменения некуда сохранить) и вредна — маскирует проблему вместо того, чтобы уронить прогон.

## Тестирование

### `npm test`

Однократный прогон Vitest (`vitest run`). Используется в CI и перед PR.

Тесты ищутся по паттерну `src/**/*.{test,spec}.{ts,js}`. Конфиг — [vitest.config.ts](../../vitest.config.ts) (отдельный от vite.config.mts, лёгкий: без Vue-плагина, но с AutoImport, потому что production-код опирается на глобальные `defineStore`/`ref`/`computed`).

Окружение — `happy-dom` (лёгкая альтернатива jsdom для unit-тестов).

Конфиг `vitest.config.ts` намеренно **не** генерирует `auto-imports.d.ts` (`dts: false`): тот же файл пишет `vite.config.mts`, но с `vueTemplate: true`. Пока `dts` был включён в обоих, прогон тестов урезал коммитнутый файл со 151 строки до 79, вырезая блок `ComponentCustomProperties` — авто-импорты внутри `<template>` переставали типизироваться.

### `npm run test:watch`

Vitest в watch-режиме (по умолчанию `vitest`). Используется при разработке: перезапускает только затронутые тесты при изменении файла.

### `npm run test:coverage`

`vitest run --coverage` (провайдер v8). Отчёт — `text-summary` в консоль + `lcov` в `coverage/` (в `.gitignore`).

Пороги заданы в [vitest.config.ts](../../vitest.config.ts) и работают как **храповик против регресса**, а не как цель: выставлены чуть ниже фактических значений на момент включения. Замер общепроектный — считается весь `src`, а не только файлы, которых коснулись тесты, поэтому новый непокрытый модуль опускает цифру. Значения скромные (~36% строк на 2026-07-21), но честные. Поднимай пороги вручную вслед за ростом покрытия.

### Стиль и расположение тестов

- Файл рядом с тестируемым модулем: `plural.ts` ↔ `plural.test.ts`.
- В тестах **явные импорты** (`import { describe, it, expect } from 'vitest'`) — globals настроены через `test.globals: true`, но явный импорт даёт лучшую читаемость.
- Pinia-сторы тестируются через `setActivePinia(createPinia())` в `beforeEach`. Пример — `src/entities/notification/model/notification.store.test.ts`.
- Async с таймерами — `vi.useFakeTimers()` + `vi.runAllTimersAsync()`. Если task rejects — подключай `expect(...).rejects` **до** `runAllTimersAsync` через `Promise.all`, иначе Vitest флагает unhandled rejection. Пример — `src/shared/lib/async/retry.test.ts`.

### E2E

E2E (Playwright или Cypress) пока не настроен — запланировано в [ROADMAP](../../ROADMAP.md), Фаза 3.

## Версии и зависимости

```bash
node --version    # должен быть ≥ 22
npm --version
npm ls            # дерево зависимостей
npm outdated      # что устарело
```

## Git-хуки и CI

Три рубежа, от дешёвого к дорогому:

| Рубеж | Что гоняет | Зачем именно там |
|---|---|---|
| `pre-commit` | `lint-staged` → `eslint --fix` на staged | Быстро, не мешает коммитить часто |
| `pre-push` | `type-check` + `test` | Не пустить сломанное в удалённый репозиторий |
| CI ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)) | lint:check → type-check → build-only → проверка генерируемых файлов → test:coverage | Полная матрица на чистой машине с `npm ci` |

Шаги в CI разнесены намеренно: по имени упавшего шага сразу видно, что сломано.

Отдельный шаг **«Generated files are up to date»** пересобирает проект и проверяет `git diff` по `auto-imports.d.ts`, `typed-router.d.ts`, `components.d.ts`. Эти файлы закоммичены, и без проверки они тихо разъезжаются с конфигами — локально всё зелёное, а у соседа нет.

Обойти хук можно через `--no-verify`, но это осознанное решение, а не рутина.

## Краткая шпаргалка

| Что нужно | Команда |
|-----------|---------|
| Запустить разработку | `npm run dev` |
| Тесты в watch | `npm run test:watch` |
| Перед PR | `npm run lint && npm run type-check && npm test` |
| Как в CI | `npm run lint:check && npm run type-check && npm run build-only && npm run test:coverage` |
| Собрать прод | `npm run build` |
| Посмотреть прод-сборку | `npm run build && npm run preview` |
