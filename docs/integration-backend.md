# Интеграция с backend

Источник истины по контракту API. Все факты сверены с кодом репозитория [`njs-server`](https://github.com/ivatutin/njs-server) (локально: `C:/WORK/v1m/njs-server`). При расхождении документа и кода бэка побеждает **код бэка** — обновляй этот файл.

Этот документ — explanation, а не reference. Точное и интерактивное описание контракта — Swagger UI: `http://localhost:3001/api/v1/docs` (когда бэк запущен).

---

## Стек

| | |
|---|---|
| Framework | NestJS 11 + TypeScript 5.9 (SWC builder) |
| Node | 20 LTS |
| DB | PostgreSQL 16 + Prisma 7 (multiSchema) |
| Cache / blacklist | Redis 7 (ioredis) |
| Identity | Keycloak 24 (OpenID Connect) |
| Validation | Zod 4 (DTO + env) |
| Logging | Pino (structured JSON) |
| Зрелость | production-ready reference, 106 unit-тестов, 95%+ coverage |

Архитектура — DDD + Hexagonal, Modular Monolith. User и Auth — изолированные bounded contexts, общаются через domain events.

---

## URL и префикс

| | |
|---|---|
| Base URL (dev) | `http://localhost:3001/api/v1` |
| Префикс | `api/v1` (`APP_PATH_PREFIX` в `njs-server/.env.example:4`) |
| Swagger UI | `http://localhost:3001/api/v1/docs` |
| Health-check | `http://localhost:3001/api/v1/health` |
| WebSocket | **не реализован** (не плодить `VITE_WS_HOST` на фронте) |
| CORS | **не настроен** на бэке — для dev обязательно нужен Vite proxy (см. ROADMAP Фаза 1) |

---

## Auth-механика

**Bearer JWT в `Authorization` header — единственный способ.** Никакого httpOnly cookie бэк не выдаёт.

### Login

`POST /auth/sign-in` (public)

Body:
```json
{ "email": "user@example.com", "password": "..." }
```

Response 200 (`TokenPairResponseDto`):
```json
{ "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }
```

`expiresIn` — время жизни **access**-токена в секундах. Бэк аутентифицируется в Keycloak через password grant. При первом sign-in для пользователя бэк также создаёт local User-запись (через `UserSignedInEvent` — асинхронно).

### Refresh

`POST /auth/refresh` (public)

Body:
```json
{ "refreshToken": "..." }
```

Response 200 — новая пара токенов (тот же `TokenPairResponseDto`). 401 — токен истёк или был отозван.

Rotation: ожидаем, что бэк возвращает **новый** refresh-токен в ответе (нужно использовать его, не старый).

### Sign-out

`POST /auth/sign-out` (protected, требует **оба** токена)

Headers:
```
Authorization: Bearer <accessToken>
```

Body:
```json
{ "refreshToken": "..." }
```

Response 204. Бэк отзывает refresh в Keycloak и кладёт access в Redis-blacklist до его естественного истечения.

### JWT claims

```ts
{ sub: string, email: string, roles: string[] }
```

`sub` — стабильный ID от Keycloak, используется для поиска local User в `/users/me`. Источник: [`njs-server` `src/modules/auth/domain/ports/identity-provider.port.ts:11-16`].

### Поведение при 401

Любой protected endpoint без валидного `Authorization` возвращает 401 в общем формате ошибки (см. ниже). Это сигнал клиенту попробовать `refresh` → повторить запрос.

---

## Формат ответов

- **camelCase** (не snake_case).
- **Плоский ответ** — сразу сущность, без обёртки `{ data, meta }`.
- **Timestamps** — ISO8601 (`.toISOString()`).
- **Числа в JSON** — стандартные (без BigInt-сериализации).
- **Nullability** — поля типа `email`/`phone`/`firstName`/`lastName` могут быть `null`, **не `undefined`** (бэк явно мапит `?? null` в [`njs-server` `src/modules/user/interfaces/http/mappers/user-http.mapper.ts:14-15`]).

Пагинация — пока не нужна (User-list ещё не реализован), формат не зафиксирован.

---

## Формат ошибок

Единый формат от глобального filter'а [`njs-server` `src/shared/infrastructure/filters/all-exceptions.filter.ts:11-18`]:

```ts
interface ErrorResponseBody {
  statusCode: number
  timestamp: string        // ISO8601
  path: string             // request URL
  error: string            // имя класса ошибки: "UnauthorizedError", "ConflictError", ...
  message: string | string[]   // string обычно, string[] при Zod-валидации
  details?: unknown        // подробности (Zod errors, и т.п.) — отсутствует при 5xx
}
```

**Маппинг доменных ошибок на HTTP-статусы** (`all-exceptions.filter.ts:55-126`):

| Domain error | HTTP | Когда |
|---|---|---|
| `UnauthorizedError` | 401 | invalid credentials, протухший токен |
| `ForbiddenError` | 403 | роль/право не подходит |
| `EntityNotFoundError` | 404 | сущность не найдена |
| `ConflictError` | 409 | email/phone уже существуют |
| `RuleViolationError`, любая `DomainError` | 422 | нарушение бизнес-инварианта |
| `HttpException` (от Nest) | как было | напр. 400 от Zod-валидации |
| **5xx** | 500 | message в response затирается на `"Internal server error"`, `details` опускается |

**Пример 400 (Zod-валидация)** — `message` массивом, `details` содержит подробности от Zod.

**Пример 409 (дубликат email)**:
```json
{
  "statusCode": 409,
  "timestamp": "2026-05-22T10:00:00.000Z",
  "path": "/api/v1/users",
  "error": "ConflictError",
  "message": "Email already exists"
}
```

**Пример 422 (нарушение бизнес-правила)**:
```json
{
  "statusCode": 422,
  "timestamp": "2026-05-22T10:00:00.000Z",
  "path": "/api/v1/users/abc-123/suspend",
  "error": "RuleViolationError",
  "message": "Cannot suspend non-active user"
}
```

---

## Endpoints

### Auth (`/auth/*`)

| Метод + Path | Auth | Body | Response | Что |
|---|---|---|---|---|
| `POST /auth/sign-in` | public | `{ email, password }` | 200 → `TokenPair` |  |
| `POST /auth/refresh` | public | `{ refreshToken }` | 200 → `TokenPair` |  |
| `POST /auth/sign-out` | protected | `{ refreshToken }` + Bearer header | 204 |  |

Источник: [`njs-server` `src/modules/auth/interfaces/http/auth.controller.ts`].

### Users (`/users/*`) — все protected

| Метод + Path | Body | Response | Что |
|---|---|---|---|
| `POST /users` | `CreateUserDto` | 201 → `UserResponseDto` | Создаёт пользователя в `pending_verification`. 409 на дубликат email/phone. 422 если ни email ни phone не передан |
| `GET /users/me` | — | 200 → `UserResponseDto` | Текущий пользователь по `sub` из JWT. **Может вернуть 404**, если local user не создан (баг доставки `UserSignedInEvent`) |
| `GET /users/:id` | — | 200 → `UserResponseDto` | По UUID. 404 если нет |
| `PATCH /users/:id/profile` | `{ firstName?: string\|null, lastName?: string\|null }` (хотя бы одно) | 200 → `UserResponseDto` |  |
| `PATCH /users/:id/contacts` | `{ email?: string\|null, phone?: string\|null }` (хотя бы одно) | 200 → `UserResponseDto` | 409 на дубликат. 422 если контакт уже verified — менять нельзя напрямую |
| `POST /users/:id/email/verify` | `{ code }` (placeholder, не валидируется) | 200 → `UserResponseDto` | `emailVerified: true` |
| `POST /users/:id/phone/verify` | `{ code }` (placeholder) | 200 → `UserResponseDto` | `phoneVerified: true` |
| `POST /users/:id/suspend` | — | 200 → `UserResponseDto` | 422 если уже не active |
| `POST /users/:id/activate` | — | 200 → `UserResponseDto` | 422 если нет verified контакта |
| `DELETE /users/:id` | — | 204 |  |

Источник: [`njs-server` `src/modules/user/interfaces/http/user.controller.ts`].

---

## `UserResponseDto`

Точная структура из [`njs-server` `src/modules/user/interfaces/http/dto/user-response.dto.ts`]:

```ts
class UserResponseDto {
  id: string                              // UUID
  email: string | null
  phone: string | null                    // E.164 (`+` + 8-15 цифр)
  emailVerified: boolean
  phoneVerified: boolean
  firstName: string | null
  lastName: string | null
  roles: string[]                         // коды ролей из Keycloak
  status: string                          // 'pending_verification' | 'active' | 'suspended' | 'deleted'
  createdAt: string                       // ISO8601
  updatedAt: string                       // ISO8601
}
```

Инвариант domain-сущности: **минимум один из `email`/`phone`** должен быть. Проверяется на HTTP DTO, domain entity, DB CHECK.

`status` — тип `string` в DTO, но реальные значения ограничены `UserStatus`-VO ([`njs-server` `src/modules/user/domain/value-objects/user-status.vo.ts:4`]):

```ts
type UserStatusType = 'pending_verification' | 'active' | 'suspended' | 'deleted'
```

**Permissions у бэка нет** — только `roles: string[]`. Маппинг ролей в permissions — задача фронта (см. [ROADMAP.md](../ROADMAP.md), Фаза 1, `[P1] roles→permissions mapping`).

---

## Особенности интеграции

- **E.164 для phone** — `^\+[1-9]\d{7,14}$`. Бэк отказывает 400 без этого. Фронт уже использует `phoneSchema` brand-type, формат совместим.
- **`/users/me` может вернуть 404** первые секунды после первого sign-in (асинхронное создание local user). Клиент это обрабатывает через `retryOn404(() => user.fetchCurrentUser(), { attempts: 3, delay: 500 })` в [bootstrap.process.ts](../src/processes/app-bootstrap/bootstrap.process.ts).
- **Sign-out требует и refresh, и access** — клиент должен корректно слать оба в одном запросе.
- **Refresh-rotation** — бэк отдаёт новый refresh в каждом ответе; старый отзывается. Клиент **обязан** заменять refresh в storage после успешного refresh.
- **Public endpoints** помечены `@Public()` — это login + refresh. Все остальные требуют Bearer JWT. Без него — 401.
- **Конкурентные 401** — клиент должен делать только один refresh-запрос на пакет упавших, остальные ждут результат (реализовано через `refreshPromise` mutex в HttpClient — см. Фаза 1.3).
- **Отозванный access после sign-out** — бэк держит access-blacklist в Redis. Использование уже отозванного токена → 401 с `error: "InvalidTokenError"`, `message: "Token has been revoked"`. Это сигнал чистого logout, обрабатывается тем же `onUnauthorized` → `auth.refresh()` фейлится → `auth.logout()` → редирект на login.
- **Профиль НЕ синхронизируется автоматически с Keycloak.** Даже если в Keycloak заполнены `firstName`/`lastName`, в `/users/me` они приходят `null` после первого sign-in. Заполняются через `PATCH /users/:id/profile`. На фронте `userStore.fullName` имеет fallback на `email`/`phone` ([user.store.ts](../src/entities/user/model/user.store.ts)).
- **Roles в `/users/me` — это Keycloak roles**, не бизнес-роли. По умолчанию у нового user: `["offline_access", "uma_authorization", "default-roles-app"]`. Эти роли наш `ROLE_PERMISSIONS` ([shared/model/permission/role-permissions.ts](../src/shared/model/permission/role-permissions.ts)) не распознаёт → `userStore.permissions` пустой → permission-протектед маршруты редиректят на `/system/forbidden`. Чтобы получить permissions, нужно либо назначить realm-role `admin`/`manager`/`user` в Keycloak, либо настроить protocol mapper, чтобы бизнес-роли попадали в JWT claims.

## Подводные камни setup Keycloak (dev)

Зафиксированы в ходе первого smoke-теста (2026-05-28):

- **Client Secret в `njs-server/.env`** должен совпадать с актуальным в Keycloak `app-backend` client → Credentials. После пересоздания client'а — обязательно обновить `KEYCLOAK_CLIENT_SECRET` и перезапустить бэк.
- **VERIFY_PROFILE realm action** включён по умолчанию в Keycloak 24+ и требует заполненных `firstName`/`lastName` на user'е. Без них любой sign-in возвращает `invalid_grant: Account is not fully set up`, а бэк маскирует это под единый `InvalidCredentialsError`. Заполнить можно через UI (Users → user → Details → Save) или Admin API.
- **Password при создании user'а — temporary: OFF.** Иначе при первом sign-in Keycloak требует смены пароля (required action), что валит password grant.
- **Бэк маскирует разные причины ошибки auth** (плохой client secret, протухший password, неверный grant, неполный профиль) под единый 401 `InvalidCredentialsError`. Это правильное security-поведение в проде, но для dev-debug **всегда смотрим `docker logs app-backend` или вывод `npm run start:dev`** — там точное сообщение от Keycloak.
- **Локальный `npm run start:dev`** против **dockerized `app-backend`** — разные процессы на одном порту :3001. При переключении: `docker stop app-backend` перед локальным запуском (и наоборот), иначе порт занят.
- **На хост-порту 8088** маппится Keycloak (`docker-compose.yml`); порт 8080 был занят сторонним процессом в окружении разработчика, потому был перемаппен. В Keycloak Admin UI ходить по `http://127.0.0.1:8088`.

---

## Security implications

**Refresh-token хранится клиентом локально** (`localStorage` / `IndexedDB`) — бэк не выдаёт httpOnly cookie, контракт построен вокруг JSON-токенов в теле/header.

Это **архитектурный выбор бэка**, фронт его не меняет. Раньше [KNOWN-ISSUES.md](../KNOWN-ISSUES.md) трактовал хранение в `localStorage` как баг фронта и предлагал «перейти на httpOnly cookie со стороны backend» — это устарело.

Митигация XSS-риска (обязанности фронта):
- Strict CSP (запрет inline-скриптов, ограничение sources) — Фаза 3 / observability.
- Никакого `eval` / `new Function` в коде.
- Sanitization любого user-generated content перед вставкой в DOM.
- Минимизация сторонних скриптов в `index.html`.

Это будет вынесено отдельным пунктом ROADMAP, когда дойдёт до Фазы 3.

---

## Изменения контракта

Если бэк меняет endpoint / схему / формат ошибок:

1. Обновляется этот документ (PR в этом репо).
2. Обновляются затронутые DTO-схемы и mapper'ы в `entities/<x>/api/`.
3. Тестируется fall-through: что произойдёт со старыми клиентами, если бэк выкатили раньше.

Бэк ведёт свой changelog в [`njs-server` `docs/DEVELOPER_GUIDE.md`](https://github.com/ivatutin/njs-server/blob/main/docs/DEVELOPER_GUIDE.md). Сверяйся с ним при апгрейдах.
