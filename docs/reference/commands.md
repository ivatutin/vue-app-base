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

Тестовый раннер пока не настроен — нет ни Vitest, ни Playwright. Это запланировано в [ROADMAP](../../ROADMAP.md), Фаза 2.

Когда добавим — здесь появятся команды `npm test`, `npm run test:unit`, `npm run test:e2e`.

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
| Перед PR | `npm run lint && npm run type-check` |
| Собрать прод | `npm run build` |
| Посмотреть прод-сборку | `npm run build && npm run preview` |
