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
| `VITE_API_URL` | `string` | URL backend API | `http://localhost/api/` |
| `VITE_WS_HOST` | `string` | Хост WebSocket | `localhost` |

## Доступ из кода

```ts
const apiUrl = import.meta.env.VITE_API_URL
```

Тип `ImportMetaEnv` объявлен в [env.d.ts](../../env.d.ts) — добавляй новые переменные **одновременно туда и в `.env`**, иначе TypeScript будет считать значение `undefined`.

## Добавление новой переменной

1. Добавь строку в [.env](../../.env): `VITE_FEATURE_X=true`.
2. Добавь поле в [env.d.ts](../../env.d.ts):
   ```ts
   interface ImportMetaEnv {
     readonly VITE_FEATURE_X: string
   }
   ```
3. (Будущее) Добавь поле в `envSchema` в `shared/config/env.ts` — Zod-валидация env-переменных запланирована в [ROADMAP](../../ROADMAP.md), Фаза 1.

## ⚠ Дубль: `src/assets/config.json`

В проекте параллельно существует [src/assets/config.json](../../src/assets/config.json) с теми же ключами (`API_URL`, `WS_HOST`), что и в `.env`:

```json
{
  "WS_HOST": "localhost",
  "API_URL": "http://localhost/api/"
}
```

Это **тех-долг** — два источника одной конфигурации. См. [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md), раздел «Code quality». Решение — Zod-валидация и единый источник в Фазе 1 [ROADMAP](../../ROADMAP.md).

Пока решение не принято — **не добавляй новые ключи в `config.json`**, используй `.env`.

## Безопасность

- ⚠ Всё, что начинается с `VITE_`, попадает в **публичный бандл**. Никаких секретов сюда!
- API-ключи, токены, креды — **только на backend**.
- Frontend получает доступы через cookie / OAuth flow, а не из env.
