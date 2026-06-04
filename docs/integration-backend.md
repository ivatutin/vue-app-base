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

## Auth endpoints planned (Phase 1-5 auth/registration suite)

> **Статус:** [planned] — спроектированы во фронте, ожидают реализации на backend. Архитектура — [ADR-0013 Keycloak Hybrid (Strategy C)](adr/0013-keycloak-hybrid-integration.md). Полные backend specs (Keycloak Admin calls, NestJS module structure, error mapping) — в [backend-auth-implementation.md](backend-auth-implementation.md). Timeline — в [auth-roadmap.md](auth-roadmap.md).
>
> До готовности backend frontend работает на MSW-моках (`VITE_USE_MSW=true` в `.env.local`). Endpoint считается реализованным когда backend выкатил + smoke-test прошёл; mock удаляется из `src/shared/lib/msw/handlers/`.

### Foundation (Phase 0) — OTP service

| Метод + Path | Auth | Body | Response | Phase |
|---|---|---|---|---|
| `POST /auth/otp/send` | public | `{ channel: 'phone', target, purpose }` | 200 → `OtpChallengeResponse` | 0 |
| `POST /auth/otp/verify` | public | `{ challengeId, code }` | 200 → `{ challengeId, verified: true, verificationToken }` | 0 |

`OtpChallengeResponse`:
```typescript
{
  challengeId: string,
  channel: 'phone',
  target: string,         // masked: '+7 (***) ***-12-34'
  expiresAt: string,      // ISO8601
  cooldownSeconds: number,
  codeLength: 6,
}
```

`purpose ∈ 'sign-up' | 'sign-in' | 'verify-contact' | 'change-contact-old' | 'change-contact-new' | 'set-password'`.

**Errors:**
- `409 ContactAlreadyExists` — при `purpose='sign-up'` если target уже зарегистрирован
- `422 OtpRateLimited` с `details: { retryAfter: number }` — слишком частые запросы
- Для `purpose='sign-in'` — **всегда 200** silently (anti-enumeration), реально OTP не шлём если phone не существует

**Verify errors:**
- `422 OtpInvalid` — wrong code (attempts++)
- `422 OtpExpired` — challenge не найден / TTL истёк
- `422 OtpTooManyAttempts` — ≥5 wrong → challenge locked

**Backend impl:** наш Redis (argon2id hash) + SMS provider abstraction (Twilio/SMS.ru). См. backend-auth-implementation.md § Phase 0.

### Email registration (Phase 1) — Keycloak magic link

| Метод + Path | Auth | Body | Response |
|---|---|---|---|
| `POST /auth/sign-up/email` | public | `{ email, password, acceptedTerms: true, firstName?, lastName? }` | 201 → `{ user: UserDto (pending_verification), verifyEmailSent: true }` |
| `POST /auth/verify-email/resend` | public | `{ email }` | 202 Accepted (anti-enumeration: всегда 202) |

**Backend impl:**
- `users.create({email, credentials: [{type:'password', value: password}], emailVerified: false, requiredActions: ['VERIFY_EMAIL']})` + `users.sendVerifyEmail(id)`
- Пользователь кликает в magic link → Keycloak `VERIFY_EMAIL` event → backend listener обновляет Postgres shadow
- Frontend на `/auth/verify-email` polling `GET /users/me` каждые 5s (TanStack Query `refetchInterval`)

**Errors:**
- `409 ContactAlreadyExists` — email занят
- `422 PasswordPolicyViolation` (Keycloak policy fail, `details.message`)
- `422 TermsNotAccepted` — если `acceptedTerms !== true`

### Forgot password (Phase 1.5) — Keycloak Required Action

| Метод + Path | Auth | Body | Response |
|---|---|---|---|
| `POST /auth/forgot-password` | public | `{ email }` | 202 Accepted (всегда, anti-enumeration) |

**Backend impl:** `users.executeActionsEmail(id, ['UPDATE_PASSWORD'], { lifespan: 3600 })`. Keycloak шлёт magic link → пользователь устанавливает новый пароль на Keycloak page.

Frontend: одна страница `/auth/forgot-password` (email input + landing «Письмо отправлено»). После клика в magic link — redirect на `/auth/login?reset=success` с toast.

**Rate limit:** 3 запроса / час per email.

### Phone registration + Phone OTP login (Phase 2)

| Метод + Path | Auth | Body | Response |
|---|---|---|---|
| `POST /auth/sign-up/phone` | public | `{ phone (E.164), verificationToken, acceptedTerms: true, firstName?, lastName? }` | 201 → `{ user, tokens }` |
| `POST /auth/sign-in/phone` | public | `{ phone, verificationToken (purpose='sign-in') }` | 200 → `TokenPair` |

**Backend impl:**
- Sign-up: validate verificationToken → `users.create({username: uuid(), attributes: {phoneNumber: [phone], phoneVerified: ['true']}, credentials: []})` (passwordless) → status `active` → auto-login через Token Exchange
- Sign-in: lookup user by `phoneNumber` attribute → если нет → 401 `InvalidCredentials` (anti-enumeration) → Token Exchange → TokenPair

**Errors:**
- `422 VerificationTokenInvalid` / `Expired`
- `409 ContactAlreadyExists` (race condition)
- `401 InvalidCredentials` (для sign-in — единый ответ для unknown phone и wrong OTP)

### Social auth (Phase 3)

| Метод + Path | Auth | Body | Response |
|---|---|---|---|
| `GET /auth/providers` | public | — | 200 → `ProviderDescriptor[]` |
| `POST /auth/oidc/callback` | public | `{ code, state, codeVerifier, redirectUri }` | 200 → `{ user, tokens, needsContactCompletion? }` |
| `POST /auth/providers/:id/callback` | public | `<provider-specific raw payload>` | 200 → `{ user, tokens, needsContactCompletion? }` |

`/auth/oidc/callback` — универсальный для Keycloak-brokered providers (Google/GitHub/VK/Yandex если Generic OIDC работает).

`/auth/providers/:id/callback` — для custom flows. `:id ∈ telegram-widget | telegram-bot | vkid | yandex` (последние два — fallback).

Provider payloads:
```typescript
// Telegram Login Widget
{ id: number, first_name: string, last_name?, username?, photo_url?, auth_date: number, hash: string }
// Telegram Bot OTP
{ botSessionToken: string, code: string }
// VK ID custom fallback
{ silentToken: string, uuid: string }
// Yandex custom fallback
{ code: string, state: string, codeVerifier: string }
```

**Backend impl:**
- Keycloak-brokered: standard OIDC token exchange через Keycloak
- Telegram Widget: validate HMAC SHA256 signature (Telegram docs), `users.create` + `addFederatedIdentity({identityProvider: 'telegram', userId, userName})`, Token Exchange
- Telegram Bot: бот хранит sessions в Redis, валидирует OTP, link user
- VK/Yandex fallback: validate через provider API, `users.create` + `addFederatedIdentity`, Token Exchange

**Errors:**
- `401 SocialAuthFailed` (wrong HMAC, expired token, provider rejected)
- `409 ProviderAccountLinked` (этот provider account уже привязан к другому local user)

`needsContactCompletion: true` если у user нет ни email ни phone (e.g., Telegram-only).

### Account security (Phase 4)

| Метод + Path | Auth | Body | Response |
|---|---|---|---|
| `POST /auth/reauth` | protected | `{ password }` | 200 → `{ reauthToken, expiresAt }` (TTL ~5min, one-shot) |
| `POST /users/me/contact-change/request` | protected + `X-Reauth-Token` | `{ channel: 'email' \| 'phone', newValue }` | 201 → `{ changeToken, requiresOldChallenge, oldChallengeId?, newChallengeId }` |
| `POST /users/me/contact-change/verify` | protected | `{ changeToken, oldCode?, newCode }` | 200 → `UserDto` (с новым контактом + verified) |
| `POST /users/me/contact-change/cancel` | protected | `{ changeToken }` | 204 |
| `POST /users/me/password` | protected + `X-Reauth-Token` | `{ newPassword }` | 204 |
| `POST /users/me/set-password` | protected | `{ verificationToken (purpose='set-password'), newPassword }` | 204 |

**Backend impl:**
- Reauth: backend через Keycloak password grant verify current password → signed JWT reauthToken в Redis (one-shot)
- Contact-change: re-auth → OTP на new (опц. на old если verified) → `users.update({email \| attributes.phoneNumber})`
- Password change (frequent): re-auth → `users.resetPassword`
- Password change (forgot-style alternative): `users.executeActionsEmail(['UPDATE_PASSWORD'])` (без re-auth, magic link)
- Set password (passwordless user): OTP на phone → `users.resetPassword`

**Errors:**
- `401 InvalidCredentials` (reauth wrong password)
- `401 ReauthTokenInvalid` / `Expired`
- `422 ChangeTokenExpired`, `OtpInvalid`, `OtpExpired`
- `409 ContactAlreadyExists` (newValue занят)
- `422 ContactChangeAlreadyPending`
- `422 PasswordPolicyViolation`

### Account Console (для advanced ops)

Не наши endpoints — Keycloak нативный self-service UI:

- Manage active sessions → `{KEYCLOAK_URL}/realms/{realm}/account/#/device-activity`
- Linked accounts (отвязать VK/Yandex/Telegram) → `/account/#/linked-accounts`
- Delete account (GDPR) → `/account/#/personal-info`
- MFA TOTP setup (future) → `/account/#/security/signing-in`
- Passkeys (future) → `/account/#/security/signing-in`

Frontend `/account/security` показывает links на эти страницы для advanced features.

### Error codes registry (полный)

Перечень новых `errorName` значений — см. [ADR-0012](adr/0012-error-coding-contract.md) и `src/shared/api/error-codes.ts` (создаётся в Phase 0).

Backend dev **обязан** использовать ровно эти `errorName` строки для согласованности с frontend `ErrorCode` registry. Добавление нового error → PR в `src/shared/api/error-codes.ts` параллельно backend изменениям.

| errorName | HTTP | Когда |
|---|---|---|
| `InvalidCredentials` | 401 | wrong password (login, reauth, phone sign-in при unknown phone) |
| `ContactAlreadyExists` | 409 | email/phone уже зарегистрирован (sign-up, contact-change) |
| `ContactNotFound` | 404 | при verify-contact existing user, такого контакта нет |
| `ContactAlreadyVerified` | 422 | попытка verify уже verified контакт |
| `OtpInvalid` | 422 | wrong OTP code |
| `OtpExpired` | 422 | challenge не найден / TTL истёк |
| `OtpTooManyAttempts` | 422 | ≥5 wrong → challenge locked, нужен resend |
| `OtpRateLimited` | 422 | too many resend; `details: { retryAfter: number }` |
| `VerificationTokenInvalid` | 422 | JWT не парсится / wrong signature |
| `VerificationTokenExpired` | 422 | TTL истёк (10 min) |
| `ChangeTokenExpired` | 422 | change request не верифицирован за 15 min |
| `ContactChangeAlreadyPending` | 422 | active change request уже есть |
| `PasswordPolicyViolation` | 422 | Keycloak policy fail; `details.message` от Keycloak |
| `TermsNotAccepted` | 422 | sign-up без `acceptedTerms: true` |
| `ReauthTokenInvalid` | 401 | X-Reauth-Token wrong / consumed |
| `ReauthTokenExpired` | 401 | 5 min TTL истёк |
| `SocialAuthFailed` | 401 | provider не подтвердил (wrong HMAC, expired token) |
| `ProviderAccountLinked` | 409 | этот provider account уже привязан к другому local user |

### Anti-enumeration policy (важно)

Чтобы не палить наличие/отсутствие пользователей через timing и разные ответы:

- `POST /auth/forgot-password` — **всегда 202**, независимо от существования email
- `POST /auth/sign-in/phone` — `401 InvalidCredentials` если phone не зарегистрирован (тот же ответ что для wrong OTP)
- `POST /auth/otp/send { purpose: 'sign-in' }` — **всегда 200** silently если target не существует
- `POST /auth/verify-email/resend` — **всегда 202**

Исключения (где anti-enumeration **нарушается** осознанно, потому что UX confuses):
- `POST /auth/otp/send { purpose: 'sign-up' }` — `409 ContactAlreadyExists` если уже занято (иначе пользователь не понимает почему signup не работает)
- `POST /auth/sign-up/email` — `409 ContactAlreadyExists` (тот же ratio)

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
