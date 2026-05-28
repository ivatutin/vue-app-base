# Reference: команды

Все скрипты из [package.json](../../package.json).

## Разработка

### `npm run dev`

Vite dev-сервер на `http://localhost:3000` с HMR.

Порт задаётся в [vite.config.mts](../../vite.config.mts) (поле `server.port`).

При запуске `unplugin-vue-router` сканирует [src/pages/](../../src/pages/), генерирует роутер и [src/typed-router.d.ts](../../src/typed-router.d.ts). `unplugin-auto-import` обновляет [src/auto-imports.d.ts](../../src/auto-imports.d.ts).

## Сборка

### `npm run build`

Production-сборка. Запускает **параллельно** через `npm-run-all2`:

1. `type-check` (`vue-tsc --build --force`) — полная проверка типов.
2. `build-only` (`vite build`) — сама сборка.

Команда падает, если хотя бы одна из двух частей упала. Это правильно — нельзя катить непротипизированный код.

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

`eslint . --fix`. Конфиг — [eslint.config.js](../../eslint.config.js), наследуется от `eslint-config-vuetify`.

Запускай **перед каждым PR**. Авто-фикс правит большую часть мелочей.

## Тестирование

### `npm test`

Однократный прогон Vitest (`vitest run`). Используется в CI и перед PR.

Тесты ищутся по паттерну `src/**/*.{test,spec}.{ts,js}`. Конфиг — [vitest.config.ts](../../vitest.config.ts) (отдельный от vite.config.mts, лёгкий: без Vue/Vuetify-плагинов, но с AutoImport, потому что production-код опирается на глобальные `defineStore`/`ref`/`computed`).

Окружение — `happy-dom` (лёгкая альтернатива jsdom для unit-тестов).

### `npm run test:watch`

Vitest в watch-режиме (по умолчанию `vitest`). Используется при разработке: перезапускает только затронутые тесты при изменении файла.

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

## Краткая шпаргалка

| Что нужно | Команда |
|-----------|---------|
| Запустить разработку | `npm run dev` |
| Тесты в watch | `npm run test:watch` |
| Перед PR | `npm run lint && npm run type-check && npm test` |
| Собрать прод | `npm run build` |
| Посмотреть прод-сборку | `npm run build && npm run preview` |
