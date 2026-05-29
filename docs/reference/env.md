# Reference: переменные окружения

## Файлы

| Файл | Назначение |
|------|-----------|
| [.env](../../.env) | Базовые значения для dev |
| `.env.local` | Локальные переопределения (НЕ коммитится) |
| `.env.production` | Значения для prod-сборки (если нужны) |

## Переменные

Все переменные frontend-runtime начинаются с `VITE_` — это требование Vite (иначе они не пробрасываются в код).

Объявлены типы в [env.d.ts](../../env.d.ts):

| Переменная | Тип | Назначение | Пример |
|------------|-----|-----------|--------|
| `VITE_API_URL` | `string` | URL backend API. В dev — путь через [Vite proxy](#dev-proxy), в prod — полный URL | `/api/v1` |
| `VITE_UI_IMPL` | `'vuetify' \| 'shadcn'` (default `vuetify`) | Какая реализация обёрток `shared/ui/base/` рендерится в runtime. Временный флаг Фазы 2.7 миграции ([ADR-0007](../adr/0007-ui-stack-migration-from-vuetify.md)) — удалится после полного перехода на shadcn-vue | `shadcn` |

## Доступ из кода

Используй runtime-валидированный singleton:

```ts
import { env } from '@/shared/config'

const apiUrl = env.VITE_API_URL
```

`import.meta.env.VITE_*` напрямую — только внутри [src/shared/config/env.ts](../../src/shared/config/env.ts) (точка валидации Zod-схемы).

## Добавление новой переменной

1. Добавь строку в [.env](../../.env): `VITE_FEATURE_X=true`.
2. Добавь поле в [env.d.ts](../../env.d.ts):
   ```ts
   interface ImportMetaEnv {
     readonly VITE_FEATURE_X: string
   }
   ```
3. Добавь поле в `envSchema` в [src/shared/config/env.ts](../../src/shared/config/env.ts) — иначе приложение упадёт на старте с понятной ошибкой.

## Dev proxy

В [vite.config.mts](../../vite.config.mts) объявлен `server.proxy`:

```ts
proxy: {
  '/api': { target: 'http://localhost:3001', changeOrigin: true },
}
```

Это пробрасывает запросы фронта с `/api/...` на `http://localhost:3001/api/...` (бэк [njs-server](../integration-backend.md)). Без proxy браузер режет cross-origin запросы (CORS на бэке не настроен).

В prod-сборке этого proxy нет — `VITE_API_URL` должен быть **полным URL** (например, `https://api.example.com/api/v1`), задаётся через `.env.production` или CI-config.

## Безопасность

- ⚠ Всё, что начинается с `VITE_`, попадает в **публичный бандл**. Никаких секретов сюда!
- API-ключи, токены, креды — **только на backend**.
- Frontend получает доступы через cookie / OAuth flow, а не из env.
