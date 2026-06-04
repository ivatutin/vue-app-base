# 0012. Error coding contract

- **Status:** accepted
- **Date:** 2026-06-03

## Context

Backend `njs-server` отдаёт ошибки в едином формате (зафиксирован в [docs/integration-backend.md](../integration-backend.md) § Формат ошибок):

```typescript
{
  statusCode: number,
  error: string,           // semantic name: 'ConflictError', 'ContactAlreadyExists', ...
  message: string | string[],
  details?: unknown
}
```

Frontend ловит это через [HttpError](../../src/shared/api/http-error.ts) — класс с `status`, `statusText`, `errorName`, `message`, `details`. Сейчас в коде:

```ts
// pages/auth/login/ui/LoginPage.vue (упрощённо)
catch (error_) {
  error.value = error_ instanceof HttpError ? error_.message : 'Не удалось войти'
}
```

Это работает для **одного** error case (login fail = «Неверный email или пароль» — generic). Но Auth/Registration suite требует **per-error UX**:

- `409 ContactAlreadyExists` при signup → показать «Email уже зарегистрирован. Войти?»
- `422 OtpInvalid` → «Неверный код, осталось N попыток»
- `422 OtpRateLimited` с `details.retryAfter: 60` → «Слишком частые запросы, повторите через 0:45»
- `422 PasswordPolicyViolation` с `details.policy: 'length', required: 12` → «Пароль должен быть не менее 12 символов»

Без structured error coding каждая страница лепит свой `if (err.message.includes('email'))` — brittle, не переводится, не grep'ается.

## Decision

### Registry `errorName` констант в `shared/api/error-codes.ts`

Единственный источник истины для всех `HttpError.errorName` значений, которые backend может вернуть. Frontend сверяется с этим registry.

```typescript
// shared/api/error-codes.ts
export const ErrorCode = {
  // Auth / credentials
  INVALID_CREDENTIALS: 'InvalidCredentials',

  // Contacts
  CONTACT_ALREADY_EXISTS: 'ContactAlreadyExists',
  CONTACT_NOT_FOUND: 'ContactNotFound',
  CONTACT_ALREADY_VERIFIED: 'ContactAlreadyVerified',

  // OTP
  OTP_INVALID: 'OtpInvalid',
  OTP_EXPIRED: 'OtpExpired',
  OTP_TOO_MANY_ATTEMPTS: 'OtpTooManyAttempts',
  OTP_RATE_LIMITED: 'OtpRateLimited',

  // Tokens
  VERIFICATION_TOKEN_INVALID: 'VerificationTokenInvalid',
  VERIFICATION_TOKEN_EXPIRED: 'VerificationTokenExpired',
  CHANGE_TOKEN_EXPIRED: 'ChangeTokenExpired',
  REAUTH_TOKEN_INVALID: 'ReauthTokenInvalid',
  REAUTH_TOKEN_EXPIRED: 'ReauthTokenExpired',

  // Business rules
  CONTACT_CHANGE_ALREADY_PENDING: 'ContactChangeAlreadyPending',
  PASSWORD_POLICY_VIOLATION: 'PasswordPolicyViolation',
  TERMS_NOT_ACCEPTED: 'TermsNotAccepted',

  // Social / federated
  SOCIAL_AUTH_FAILED: 'SocialAuthFailed',
  PROVIDER_ACCOUNT_LINKED: 'ProviderAccountLinked',
} as const

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode]
```

### Helper `matchError(err, code)`

```typescript
export function matchError (err: unknown, code: ErrorCode): boolean {
  return err instanceof HttpError && err.errorName === code
}
```

### Применение в коде

**Pattern A — inline в submit-handler формы:**

```vue
<script setup lang="ts">
async function submit (values: SignUpEmailDto) {
  try {
    await signupEmailFlow(values)
    await router.push('/auth/verify-email')
  } catch (err) {
    if (matchError(err, ErrorCode.CONTACT_ALREADY_EXISTS)) {
      setFieldError('email', 'Этот email уже зарегистрирован')
    } else if (matchError(err, ErrorCode.PASSWORD_POLICY_VIOLATION)) {
      setFieldError('password', `Слабый пароль: ${err.details.message ?? ''}`)
    } else {
      // unknown — пускаем в глобальный handler
      throw err
    }
  }
}
</script>
```

**Pattern B — централизованный mapper для общих случаев:**

В `shared/api/error-codes.ts` опционально хранится `ERROR_MESSAGES` — словарь для default-сообщений (используется в global error-handler через notification store):

```typescript
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_CREDENTIALS]: 'Неверные учётные данные',
  [ErrorCode.OTP_INVALID]: 'Неверный код подтверждения',
  [ErrorCode.OTP_EXPIRED]: 'Срок действия кода истёк, запросите новый',
  // ...
}

export function getErrorMessage (err: unknown): string {
  if (err instanceof HttpError && err.errorName in ERROR_MESSAGES) {
    return ERROR_MESSAGES[err.errorName as ErrorCode]
  }
  return 'Что-то пошло не так'
}
```

### Anti-enumeration

Некоторые errorName **не используются** на специфичных endpoints для anti-enumeration:

- `POST /auth/forgot-password { email }` → всегда `202` (не возвращает `ContactNotFound` даже если email не существует)
- `POST /auth/sign-in/phone { phone, verificationToken }` → если phone не зарегистрирован, возвращает `401 InvalidCredentials` (тот же ответ что для wrong OTP) — не `ContactNotFound`
- `POST /auth/otp/send { purpose: 'sign-in' }` → **всегда 200** (silently не отправляет если target не существует)

Эти исключения документированы в [backend-auth-implementation.md](../backend-auth-implementation.md) и в комментариях `errorName` registry.

### `details` payload — typed accessors

Для error'ов с structured `details` — типизированные accessors:

```typescript
// e.g. OtpRateLimited: { retryAfter: number }
export function getRetryAfter (err: HttpError): number | null {
  if (matchError(err, ErrorCode.OTP_RATE_LIMITED)) {
    return (err.details as { retryAfter?: number })?.retryAfter ?? null
  }
  return null
}
```

Это можно делать lazily — только когда понадобится в коде. Не плодим accessors на каждый error заранее.

### Конвенции

1. **Imports** через barrel `@/shared/api`: `import { ErrorCode, matchError } from '@/shared/api'`.
2. **Не сравниваем по `err.status`** для бизнес-ошибок (`409` может быть и ContactAlreadyExists, и ProviderAccountLinked). Всегда через `matchError`.
3. **Новый error добавляется в `ErrorCode`** — иначе frontend silently не reaktиrует. Это форс-функция синхронизации backend ↔ frontend контракта.
4. **Backend dev обязан использовать те же `errorName`** — зафиксировано в [docs/integration-backend.md](../integration-backend.md) и [docs/backend-auth-implementation.md](../backend-auth-implementation.md).

## Consequences

### Положительные

- **Точные UX-сообщения** вместо generic `err.message`.
- **TypeScript guarantees**: новый `errorName` от backend требует добавления в `ErrorCode` enum, иначе `matchError` ловит «no such code» на типов уровне.
- **Grep-friendly**: можно найти все места использования конкретного error: `git grep "ErrorCode.OTP_INVALID"`.
- **i18n-ready**: `ERROR_MESSAGES` словарь — естественная точка интеграции i18n когда подключим vue-i18n.

### Отрицательные

- **Sync overhead** между frontend и backend: добавление нового error на бэке требует PR на фронт (в `ErrorCode`). Митигация: список errorName зафиксирован в `docs/integration-backend.md` — backend dev проверяет перед добавлением нового.
- **Verbose**: `if (matchError(err, ErrorCode.X)) ... else if (matchError(err, ErrorCode.Y)) ...` — но это лучше чем `if (err.message.includes('x'))`.

### Что меняется в коде

- **Phase 0**:
  - `src/shared/api/error-codes.ts` — registry + `matchError` + `ERROR_MESSAGES` + helpers
  - `src/shared/api/index.ts` — экспорт `ErrorCode`, `matchError`, `getErrorMessage`, etc.
  - Unit-тесты на `matchError` (с HttpError vs обычной Error vs null)
- **Phase 1+**: каждый flow/page использует `matchError` для UX-логики.
- **Setup-error-handler** — обновляется для использования `getErrorMessage` (вместо текущего `err.message`).

## Альтернативы (для истории)

### Полагаться только на `err.message`

Сейчас так. Не работает для multi-error UX, hard-to-translate, brittle (изменение wording на бэке ломает фронт).

### `err.status` + endpoint-specific switch

Бы работало для простых случаев (409 на signup → ContactAlreadyExists очевидно), но падает на endpoint'ах с **несколькими** 409 (например, 409 ContactAlreadyExists vs 409 ProviderAccountLinked на одном callback'е). Кодирование через name — robust.

### gRPC-style structured error codes (numeric)

Overkill для REST + HTTP-status-already-numeric. `errorName` строки — читаемее в логах и dev tools.

## Связанные ADR / документы

- [ADR-0006](0006-fetch-based-http-client.md) — HttpClient + HttpError (фиксирует контракт `errorName`).
- [ADR-0010](0010-form-architecture-vee-validate-zod.md) — Form architecture (использует `matchError` + `setFieldError`).
- [ADR-0011](0011-otp-verification-model.md) — OTP errors registry (`OtpInvalid`, etc).
- [docs/integration-backend.md](../integration-backend.md) — полный backend контракт ошибок.
