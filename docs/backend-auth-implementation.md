# Backend Auth Implementation Guide (spec-level)

> Spec-level инструкция для backend dev'а по реализации auth/registration API в [njs-server](https://github.com/...) (NestJS + Keycloak + Postgres + Redis). Архитектура — [Strategy C (Hybrid Keycloak Admin)](#strategy-c-recap), см. [plan-файл](C:/Users/vim/.claude/plans/10-luminous-mist.md) и [auth-roadmap.md](auth-roadmap.md).
>
> **Уровень детализации:** spec-level — endpoint контракты, Keycloak Admin interactions, DTO, error mapping. Полные NestJS файлы не приводим — senior backend dev напишет сам, опираясь на текущий FSD-стиль njs-server.

---

## Strategy C recap

**Принцип:** делегируем Keycloak максимум того, что он делает нативно. Custom код пишем только там, где нативной поддержки нет.

**Боундари Keycloak vs наш код** — полная таблица в [plan-файле § Keycloak Integration Boundary](C:/Users/vim/.claude/plans/10-luminous-mist.md).

Кратко:
- **Делегируем Keycloak:** email verification (magic link), forgot/change password (Required Action), Google/GitHub/Apple, VK ID + Yandex (попытка через Generic OIDC), Account Console (sessions/linked/delete/2FA), audit auth events (Events API), password policy, brute force, CAPTCHA, i18n, WebAuthn.
- **Custom (наш код):** phone-OTP service, Telegram (Widget HMAC + Bot OTP), phone login через Token Exchange, single-page change email/phone UX, re-auth short token, VK/Yandex fallback если Generic OIDC не справится.

---

## Содержание

- [Phase 0 — Keycloak Realm Setup + NestJS infrastructure](#phase-0)
- [Phase 1 — Email registration](#phase-1)
- [Phase 1.5 — Forgot password](#phase-15)
- [Phase 2 — Phone registration + Phone login](#phase-2)
- [Phase 3 — Social auth (VK / Yandex / Telegram)](#phase-3)
- [Phase 4 — Account security (verify + change)](#phase-4)
- [Cross-cutting: Error coding](#error-coding)
- [Cross-cutting: Event listening](#event-listening)
- [Cross-cutting: Testing strategy](#testing)
- [Production readiness checklist](#production)

---

<a id="phase-0"></a>
## Phase 0 — Keycloak Realm Setup + NestJS infrastructure

### A. Keycloak Realm Configuration

Через Keycloak Admin UI (http://localhost:8088 для dev) или CLI `kcadm.sh`:

#### A.1 SMTP (Realm Settings → Email)
**Критично** — без SMTP email verification + forgot password + change email magic links не работают.

Dev: использовать **Mailpit** (`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`), Keycloak SMTP host `mailpit`, port `1025`, без auth.

Production: SES / SendGrid / Postmark.

#### A.2 Password Policy (Realm Settings → Authentication → Policies)
NIST SP 800-63B compliant:
- `length(12)` — минимум 12 символов
- НЕ устанавливать: passwordHistory, expiration, composition rules
- Опционально: HIBP check через extension `keycloak-password-blacklists`

#### A.3 Brute Force Detection (Realm Settings → Security Defenses)
- Enable: `true`
- Max Login Failures: `5`
- Wait Increment Seconds: `60`
- Quick Login Check Milli Seconds: `1000`
- Max Wait Seconds: `900` (15 min)

#### A.4 Internationalization
- Enabled: `true`
- Supported Locales: `ru, en`
- Default Locale: `ru`

#### A.5 User Profile (Realm Settings → User Profile, Keycloak 24+)
Добавить custom attributes:
- `phoneNumber`: type=string, validators: `length(min=5, max=20)`, regex E.164: `^\+[1-9]\d{7,14}$`, permission: user can edit
- `phoneVerified`: type=string ('true'|'false'), permission: only admin can edit

#### A.6 Account Console (Clients → account-console)
Уже существует по умолчанию. Опционально:
- Theme branding через Realm Settings → Themes → Account Theme (FTL templates + CSS)
- На старте — оставить default

#### A.7 Token Exchange (для phone-login + custom social)
Keycloak 26+:
- Realm: `admin-permissions-enabled` = true
- Client `app-backend`: Permissions tab → enable, scope `token-exchange`
- Создать policy «service-account-only» (только service account может выполнять token exchange)

#### A.8 Service Account (Client `app-backend`)
- Settings: «Service accounts enabled» = true
- Service Account Roles → Assign:
  - `realm-management/manage-users`
  - `realm-management/view-users`
  - `realm-management/query-users`
  - `realm-management/manage-identity-providers`
  - `realm-management/view-events`

#### A.9 Identity Providers (Realm → Identity Providers)
Добавить (по бизнес-приоритету):

**Google / GitHub** (для будущего):
- Add provider → Google / GitHub
- Client ID / Client Secret из Google Cloud Console / GitHub OAuth Apps

**VK ID через Generic OIDC** (попытка #1 в Phase 3):
- Add provider → OpenID Connect v1.0
- Alias: `vkid`
- Authorization URL: `https://id.vk.ru/authorize`
- Token URL: `https://id.vk.ru/oauth2/auth`
- User Info URL: `https://id.vk.ru/oauth2/user_info`
- JWKS URL: `https://id.vk.ru/oauth2/public_key`
- Default Scopes: `openid email phone`
- Client Authentication: `Client secret sent as post`
- Client ID + Secret из VK app

**Yandex через Generic OIDC**:
- Add provider → OpenID Connect v1.0
- Alias: `yandex`
- Discovery endpoint: `https://login.yandex.ru/.well-known/openid-configuration` (auto-config)
- Client ID + Secret из Yandex OAuth

**Mappers** для каждого OIDC provider:
- Map `email` claim → email user attribute
- Map `phone_number` claim → phoneNumber user attribute (если provider отдаёт)

#### A.10 Required Actions (Authentication → Required Actions)
Enable + Default Action:
- `VERIFY_EMAIL` ✅
- `UPDATE_PASSWORD` ✅
- `UPDATE_PROFILE` ✅
- `CONFIGURE_TOTP` (для future MFA)
- `webauthn-register` (для future Passkeys)

### B. NestJS Module Structure

Новые модули в `njs-server/src/modules/`:

#### B.1 `keycloak-admin/` module
- `KeycloakAdminService` (`@Injectable`):
  - Singleton instance `@keycloak/keycloak-admin-client`
  - Метод `getAdminClient()` — возвращает authenticated client, обновляет admin token из Redis (TTL = `expiresIn - 30s`), refresh при истечении через client_credentials grant
  - Wrap для всех Keycloak Admin вызовов с error mapping в наши доменные ошибки
- Exports: `KeycloakAdminService`

#### B.2 `keycloak-events/` module
- `KeycloakEventListenerService`:
  - Cron job каждые 30 секунд: `GET /admin/realms/{realm}/events?dateFrom={lastPolled}&type=LOGIN,REGISTER,UPDATE_EMAIL,VERIFY_EMAIL,UPDATE_PASSWORD,DELETE_ACCOUNT`
  - Для каждого нового event → emit domain event в наш EventBus
  - State: `lastPolledAt` в Redis (с TTL inf)
- Альтернатива production: SPI Java event listener pushing webhook на NestJS endpoint `POST /internal/keycloak/events` (требует Keycloak SPI build + deploy)

#### B.3 `otp/` module
- `OtpService` (`@Injectable`):
  - `generate(target: string, channel: 'email' | 'phone', purpose: OtpPurpose): Promise<{ challengeId: string, expiresAt: Date, cooldownSeconds: number }>`
    - Генерирует UUID challengeId
    - Случайный 6-digit code (cryptographically secure)
    - Hash code через argon2id
    - Хранит в Redis: `otp:{challengeId}` → `{ targetHash, channel, purpose, codeHash, attempts: 0, createdAt, expiresAt }`, TTL 5 min
    - Rate-limit checks: per-target (3/hour), per-IP (10/hour) через Redis counters
    - Отправляет OTP через соответствующий channel (SmsProvider или EmailProvider)
  - `verify(challengeId: string, code: string): Promise<{ verificationToken: string }>`
    - Lookup challenge в Redis; если нет → 422 OtpExpired
    - Check attempts; если ≥5 → invalidate challenge → 422 OtpTooManyAttempts
    - Compare code hash (constant-time через argon2.verify)
    - Если match → mark consumed → generate verificationToken (JWT, signed by наш HS256, expires 10 min, payload `{ challengeId, target, channel, purpose }`)
- `SmsProvider` interface:
  - `send(phone: string, message: string): Promise<{ messageId: string }>`
  - Реализации: `TwilioSmsProvider`, `SmsRuSmsProvider`, `MockSmsProvider` (для dev — пишет в console + Redis для извлечения в тестах)
- `EmailProvider` interface (для custom OTP fallback):
  - `send(email: string, subject: string, html: string): Promise<{ messageId: string }>`
  - Production: SES / SendGrid; Dev: Mailpit
- Конфигурация через env: `SMS_PROVIDER=twilio|smsru|mock`, `TWILIO_*`, `SMSRU_*`

#### B.4 `token-exchange/` module
- `TokenExchangeService` (`@Injectable`):
  - `exchangeForUser(keycloakId: string): Promise<TokenPair>` — выполняет RFC 8693 token exchange от service-account на имя user'а
  - Использует Keycloak token endpoint с `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, `subject_token=<service-account-token>`, `requested_subject=<keycloakId>`, `audience=app-backend`

#### B.5 `auth-internal/` module (расширение existing `auth/`)
- Endpoints для всех phases (см. ниже)
- Use cases:
  - `SignUpEmailUseCase`
  - `RequestOtpUseCase`, `VerifyOtpUseCase`
  - `SignUpPhoneUseCase`, `SignInPhoneUseCase`
  - `SocialCallbackUseCase` (с strategy pattern per provider)
  - `ForgotPasswordUseCase`
  - `ReauthUseCase`

### C. Environment Variables (новые)

Добавить в `.env.example`:

```bash
# Keycloak Admin (для KeycloakAdminService)
KEYCLOAK_ADMIN_CLIENT_ID=app-backend
KEYCLOAK_ADMIN_CLIENT_SECRET=<service-account-secret>

# SMS Provider
SMS_PROVIDER=mock  # mock | twilio | smsru
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SMSRU_API_ID=

# Email Provider (для custom OTP fallback; Keycloak использует свой SMTP)
EMAIL_PROVIDER=keycloak  # keycloak | smtp | ses

# OTP
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_COOLDOWN_SECONDS=60

# JWT (для verificationToken и reauthToken)
JWT_VERIFICATION_TOKEN_SECRET=<random-256-bit>
JWT_REAUTH_TOKEN_SECRET=<random-256-bit>

# Social providers (если custom fallback)
VK_ID_CLIENT_ID=
VK_ID_CLIENT_SECRET=
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
```

### D. Existing User table — расширения (если нужны)

Текущая Prisma `User` уже имеет `email`, `phone`, `emailVerifiedAt`, `phoneVerifiedAt`, `keycloakId`, `status`. Поля достаточны.

**Опционально** добавить `User.identityProviders` (JSON-поле) — для shadow federatedIdentities (если хотим избежать постоянных запросов к Keycloak). Не обязательно.

---

<a id="phase-1"></a>
## Phase 1 — Email registration

### Endpoint: `POST /auth/sign-up/email`

**Request:**
```typescript
{
  email: string        // valid email
  password: string     // min 12 chars (Keycloak проверит policy)
  acceptedTerms: true  // explicit consent (GDPR)
  firstName?: string   // опц.
  lastName?: string    // опц.
}
```

**Behavior:**
1. Validate input (Zod schema)
2. Check email uniqueness в Keycloak: `keycloakAdmin.users.find({ email, exact: true })`. Если найден → 409 `ContactAlreadyExists`
3. Create user в Keycloak:
   ```typescript
   const newUser = await keycloakAdmin.users.create({
     realm: 'app',
     email,
     username: email,            // или UUID, см. ниже trade-off
     firstName,
     lastName,
     enabled: true,
     emailVerified: false,
     requiredActions: ['VERIFY_EMAIL'],
     credentials: [{ type: 'password', value: password, temporary: false }],
   })
   ```
   Keycloak вернёт `{ id: '<uuid>' }`. Это `keycloakId`.
4. Trigger email verification: `keycloakAdmin.users.sendVerifyEmail({ id: newUser.id })`
5. Existing `OnUserSignedInEvent` handler не сработает (user ещё не залогинен) — нужен **новый** handler на `UserCreatedEvent`:
   - Сохранить local User shadow в Postgres: `status='pending_verification'`, `emailVerifiedAt: null`, `keycloakId`
6. **НЕ возвращаем tokens** — auth начинается после verify email
7. Response 201: `{ user: UserDto, verifyEmailSent: true }`

**Trade-off username**: использовать email vs UUID. **Рекомендация**: UUID — устойчиво к изменению email; phone-only users тоже получат UUID. Lookup по email — через `keycloakAdmin.users.find({ email })`.

**Errors:**
- 409 `ContactAlreadyExists` (email уже зарегистрирован)
- 422 `PasswordPolicyViolation` (Keycloak forward'ит)
- 400 (Zod validation)
- 422 `TermsNotAccepted` (если `acceptedTerms !== true`)

### Endpoint: `POST /auth/verify-email/resend`

**Request:** `{ email: string }`

**Behavior:**
1. Lookup user в Keycloak. Если не найден → **всё равно 202** (anti-enumeration)
2. Если найден и `emailVerified === false` → `keycloakAdmin.users.sendVerifyEmail({ id })`
3. Rate-limit: 1 запрос / 60s per email
4. Response 202 Accepted

### Event: Keycloak `VERIFY_EMAIL` 

`KeycloakEventListenerService` обрабатывает event:
- `userId` → lookup local User по `keycloakId` → `update({ emailVerifiedAt: new Date(), status: 'active' })`
- Emit `EmailVerifiedEvent`

### Endpoint: `GET /users/me` (existing) — расширение

Возвращает текущее состояние user'а (включая `emailVerified: true` после клика в magic link).

Frontend на `/auth/verify-email` poll'ит этот endpoint каждые 5s через TanStack Query `refetchInterval`. Когда `emailVerified: true` → redirect на `/dashboard`.

---

<a id="phase-15"></a>
## Phase 1.5 — Forgot password

### Endpoint: `POST /auth/forgot-password`

**Request:** `{ email: string }`

**Behavior:**
1. Lookup user в Keycloak по email. Если нет → **всё равно 202** (anti-enumeration)
2. Если найден → `keycloakAdmin.users.executeActionsEmail({ id, actions: ['UPDATE_PASSWORD'], lifespan: 3600 })` (magic link, действует 1 час)
3. Keycloak отправит email с link на свою страницу установки пароля
4. После установки нового пароля → Keycloak fires `UPDATE_PASSWORD` event → можно использовать для audit log
5. Rate-limit: 3 запроса / hour per email
6. Response 202 Accepted

**Errors:** Минимум — anti-enumeration принцип всегда 202.

---

<a id="phase-2"></a>
## Phase 2 — Phone registration + Phone login

### Endpoint: `POST /auth/otp/send`

**Request:**
```typescript
{
  channel: 'phone'              // в Phase 2 только phone (email через Keycloak magic link)
  target: string                // phone в E.164: '+79991234567'
  purpose: 'sign-up' | 'sign-in' | 'verify-contact' | 'change-contact-old' | 'change-contact-new'
}
```

**Behavior:**
1. Validate phone format
2. Для `purpose === 'sign-up'`: check phone uniqueness через `keycloakAdmin.users.find({ q: 'phoneNumber:+7999...' })`. Если занят → 409 `ContactAlreadyExists` (отступление от anti-enumeration для signup — иначе UX confuses)
3. Для `purpose === 'sign-in'`: если phone не найден → **всё равно 200** (anti-enumeration), но реально OTP не шлём
4. `OtpService.generate({ target, channel: 'phone', purpose })` → SmsProvider.send(phone, `Код подтверждения: ${otp}`)
5. Response 200:
   ```typescript
   {
     challengeId: string,
     channel: 'phone',
     target: '+7 (***) ***-12-34',  // masked
     expiresAt: ISO8601,
     cooldownSeconds: 60,
     codeLength: 6,
   }
   ```

**Rate-limit (per target):** 3 запроса / hour. Per IP: 10 / hour.

**Errors:**
- 409 `ContactAlreadyExists` (только для sign-up)
- 422 `OtpRateLimited` с `details.retryAfter` секунд

### Endpoint: `POST /auth/otp/verify`

**Request:** `{ challengeId: string, code: string }`

**Behavior:**
1. `OtpService.verify(challengeId, code)` → если match: generate `verificationToken` (JWT, 10 min TTL, payload `{ challengeId, target, channel, purpose }`)
2. Response 200: `{ challengeId, verified: true, verificationToken }`

**Errors:**
- 422 `OtpInvalid` (неверный код, attempts++)
- 422 `OtpExpired` (challenge не найден / истёк)
- 422 `OtpTooManyAttempts` (≥5 wrong attempts — challenge invalidated)

### Endpoint: `POST /auth/sign-up/phone`

**Request:**
```typescript
{
  phone: string                 // E.164
  verificationToken: string     // из verify (purpose='sign-up', channel='phone', target=phone)
  acceptedTerms: true
  firstName?: string
  lastName?: string
}
```

**Behavior:**
1. Validate verificationToken (decode JWT, check purpose, channel, target match phone)
2. Create user в Keycloak:
   ```typescript
   const newUser = await keycloakAdmin.users.create({
     realm: 'app',
     username: uuid(),               // UUID — phone хранится в attribute
     enabled: true,
     emailVerified: false,           // нет email
     attributes: {
       phoneNumber: [phone],
       phoneVerified: ['true'],      // OTP уже подтвердил
     },
     firstName,
     lastName,
     credentials: [],                // passwordless
   })
   ```
3. Postgres shadow user: `emailVerifiedAt: null`, `phoneVerifiedAt: new Date()`, `status: 'active'` (т.к. phone уже verified)
4. **Auto-login**: `TokenExchangeService.exchangeForUser(newUser.id)` → TokenPair
5. Response 201: `{ user: UserDto, tokens: TokenPair }`

**Errors:**
- 422 `VerificationTokenInvalid` / `Expired`
- 409 `ContactAlreadyExists` (race condition — кто-то зарегистрировался между OTP send и sign-up)

### Endpoint: `POST /auth/sign-in/phone`

**Request:** `{ phone: string, verificationToken: string }` (purpose='sign-in', channel='phone')

**Behavior:**
1. Validate verificationToken
2. Lookup user в Keycloak по `phoneNumber` attribute
3. Если нет → 401 `InvalidCredentials` (одинаковый ответ для unknown phone и wrong OTP — anti-enumeration)
4. `TokenExchangeService.exchangeForUser(keycloakId)` → TokenPair
5. Response 200: TokenPair

---

<a id="phase-3"></a>
## Phase 3 — Social auth (VK / Yandex / Telegram)

### Strategy: Generic OIDC через Keycloak (primary), Custom backend (fallback)

#### Path 1: Через Keycloak Identity Brokering (для VK + Yandex попытка)

Если Generic OIDC настроен (см. [A.9](#a9-identity-providers-realm--identity-providers)):

**Frontend flow:**
- User click «VK ID» → frontend redirect на `/realms/app/protocol/openid-connect/auth?client_id=app-frontend&kc_idp_hint=vkid&response_type=code&redirect_uri=...&scope=openid&state=<csrf>&code_challenge=<pkce>&code_challenge_method=S256`
- Keycloak handles VK OAuth → callback с code
- Frontend → `POST /auth/oidc/callback { code, state, codeVerifier }`
- Backend меняет code на TokenPair через standard OIDC token endpoint
- Keycloak автоматически создал user + federatedIdentity

**Backend endpoint: `POST /auth/oidc/callback`** (универсальный для всех Keycloak-brokered providers):

```typescript
Request: { code: string, state: string, codeVerifier: string, redirectUri: string }
```

Backend:
1. Validate state (CSRF) — был ли issued ранее
2. Call Keycloak token endpoint: `POST /realms/app/protocol/openid-connect/token` с `grant_type=authorization_code`, `code`, `code_verifier`, etc.
3. Response 200: `{ user: UserDto, tokens: TokenPair, needsContactCompletion?: boolean }`

`needsContactCompletion: true` если user не имеет ни email ни phone (provider не отдал).

#### Path 2: Custom backend endpoint (для Telegram + fallback для VK/Yandex если OIDC fail)

**Endpoint: `POST /auth/providers/:id/callback`**

`:id` ∈ `{ telegram-widget, telegram-bot, vkid, yandex }` (последние два — fallback).

**Telegram Login Widget callback:**

```typescript
Request body: {
  id: number,                    // Telegram user ID
  first_name: string,
  last_name?: string,
  username?: string,
  photo_url?: string,
  auth_date: number,             // Unix timestamp
  hash: string                   // HMAC SHA256 подпись
}
```

Backend:
1. Validate HMAC: secret = `SHA256(TELEGRAM_BOT_TOKEN)`, message = url-encoded sorted params (исключая `hash`), expected = `HMAC_SHA256(secret, message)`. Compare constant-time с `hash`. Если не match → 401 `SocialAuthFailed`
2. Check `auth_date` не старше 5 min (replay protection)
3. Lookup local User по `federatedIdentity('telegram', id)`. Если нет → create:
   - `keycloakAdmin.users.create({ username: uuid(), firstName, lastName, enabled: true, ... })`
   - `keycloakAdmin.users.addToFederatedIdentity({ id: keycloakId, federatedIdentityId: 'telegram', payload: { identityProvider: 'telegram', userId: id.toString(), userName: username ?? id.toString() } })`
   - Postgres shadow user
4. `TokenExchangeService.exchangeForUser(keycloakId)` → TokenPair
5. Response 200: `{ user: UserDto, tokens: TokenPair, needsContactCompletion: !user.email && !user.phone }`

**Telegram Bot OTP callback:** Аналогично, но payload `{ botSessionToken: string, code: string }`. Бот хранит sessions в Redis с `(phone, otp)`. Backend verify, link user.

**VK ID custom fallback:** Backend получает `{ silentToken, uuid }`, валидирует через `https://api.vk.com/method/auth.exchangeSilentAuthToken` → user data → create/link.

**Yandex custom fallback:** Backend получает `{ code, state, codeVerifier }`, exchange через `https://oauth.yandex.ru/token` → `https://login.yandex.ru/info` → user data → create/link.

### Endpoint: `GET /auth/providers`

**Response:**
```typescript
[
  { id: 'vkid', label: 'VK ID', enabled: true, type: 'oidc-brokered' },
  { id: 'yandex', label: 'Yandex', enabled: true, type: 'oidc-brokered' },
  { id: 'telegram-widget', label: 'Telegram', enabled: true, type: 'custom' },
  { id: 'google', label: 'Google', enabled: false, type: 'oidc-brokered' }
]
```

Frontend читает (или полагается на env-config). Backend reads из realm settings + env feature flags.

---

<a id="phase-4"></a>
## Phase 4 — Account security (verify + change)

### Endpoint: `POST /auth/reauth`

**Request:** `{ password: string }` (Bearer header — текущий access token)

**Behavior:**
1. Extract userId from Bearer token
2. Lookup user в Keycloak → username (email или UUID)
3. Verify password через Keycloak password grant: `POST /realms/app/protocol/openid-connect/token` c `grant_type=password`, `username`, `password`, `client_id=app-backend`. Если 401 → 401 `InvalidCredentials`
4. Если OK: generate `reauthToken` (JWT, 5 min TTL, signed by `JWT_REAUTH_TOKEN_SECRET`, payload `{ userId, issuedAt }`), store in Redis с key `reauth:{token}` для one-shot consume
5. Response 200: `{ reauthToken, expiresAt }`

**Errors:** 401 `InvalidCredentials`

### Endpoint: `POST /users/me/contact-change/request`

**Headers:** `X-Reauth-Token: <reauthToken>` (kроме phone change если passwordless)

**Request:** `{ channel: 'email' | 'phone', newValue: string }`

**Behavior:**
1. Validate reauthToken (decode + check Redis), consume (one-shot)
2. Check newValue не равен currentValue
3. Check newValue uniqueness (`keycloakAdmin.users.find({ email })` или by attribute)
4. Lookup current user; determine `requiresOldChallenge`:
   - true if `(channel === 'email' && user.emailVerified) || (channel === 'phone' && user.phoneVerified)`
5. Generate changeToken (JWT, 15 min TTL, payload `{ userId, channel, newValue, oldValueAtRequest, requiresOldChallenge }`)
6. Generate OTP challenges (`OtpService.generate`):
   - newChallenge: target=newValue, channel, purpose='change-contact-new'
   - oldChallenge (если `requiresOldChallenge`): target=oldValue, same channel, purpose='change-contact-old'
7. Response 201:
   ```typescript
   {
     changeToken: string,
     requiresOldChallenge: boolean,
     oldChallengeId?: string,
     newChallengeId: string
   }
   ```

**Errors:**
- 401 `ReauthTokenInvalid` / `ReauthTokenExpired`
- 409 `ContactAlreadyExists` (newValue занят)
- 422 `ContactChangeAlreadyPending` (race / уже есть active change request)

### Endpoint: `POST /users/me/contact-change/verify`

**Request:** `{ changeToken: string, oldCode?: string, newCode: string }`

**Behavior:**
1. Validate changeToken (decode JWT, check expiry)
2. Verify oldCode if `requiresOldChallenge` → OtpService.verify(oldChallengeId, oldCode). Если не match → 422
3. Verify newCode → OtpService.verify(newChallengeId, newCode). Если не match → 422
4. Apply change в Keycloak:
   - Email: `keycloakAdmin.users.update({ email: newValue, emailVerified: true })`
   - Phone: `keycloakAdmin.users.update({ attributes: { phoneNumber: [newValue], phoneVerified: ['true'] } })`
5. Update Postgres shadow
6. Emit `EmailChangedEvent` / `PhoneChangedEvent` (для audit + notifications)
7. Response 200: UserDto (с новыми contact details)

**Errors:** 422 `OtpInvalid` / `OtpExpired` / `ChangeTokenExpired`

### Endpoint: `POST /users/me/contact-change/cancel`

**Request:** `{ changeToken: string }`

**Behavior:** Invalidate changeToken + связанные OTP challenges в Redis. Response 204.

### Endpoint: `POST /users/me/password`

**Headers:** `X-Reauth-Token`

**Request:** `{ newPassword: string }`

**Behavior:**
1. Consume reauthToken
2. `keycloakAdmin.users.resetPassword({ id, credential: { type: 'password', value: newPassword, temporary: false } })`
3. Keycloak fires `UPDATE_PASSWORD` event → audit
4. Response 204

**Errors:** 422 `PasswordPolicyViolation` (Keycloak вернёт detail message)

### Endpoint: `POST /users/me/set-password` (для passwordless phone users)

**Request:** `{ verificationToken: string, newPassword: string }` (verificationToken из OTP на phone, purpose='set-password')

**Behavior:** Аналогично change-password но без reauthToken (т.к. password ещё не было — проверяем через свежий phone OTP).

---

<a id="error-coding"></a>
## Cross-cutting: Error coding

Все ошибки следуют существующему контракту njs-server:

```typescript
{
  statusCode: number,
  error: string,           // semantic name, e.g. 'ContactAlreadyExists'
  message: string | string[],
  details?: unknown        // structured payload (e.g., { retryAfter: 60 })
}
```

**Полный registry новых `errorName`:**

| errorName | HTTP | Когда |
|---|---|---|
| `InvalidCredentials` | 401 | wrong password (login, reauth, phone OTP при wrong phone) |
| `ContactAlreadyExists` | 409 | email/phone уже зарегистрирован (sign-up) |
| `ContactNotFound` | 404 | при verify-contact existing user, такого контакта нет |
| `ContactAlreadyVerified` | 422 | попытка verify уже verified контакт |
| `OtpInvalid` | 422 | wrong OTP code |
| `OtpExpired` | 422 | challenge не найден / expired |
| `OtpTooManyAttempts` | 422 | ≥5 wrong attempts → challenge locked |
| `OtpRateLimited` | 422 | too many resend; `details: { retryAfter: seconds }` |
| `VerificationTokenInvalid` | 422 | JWT не парсится / wrong signature |
| `VerificationTokenExpired` | 422 | TTL истёк |
| `ChangeTokenExpired` | 422 | change request не верифицирован за 15 min |
| `ContactChangeAlreadyPending` | 422 | active change request уже есть |
| `PasswordPolicyViolation` | 422 | Keycloak policy fail; `details: { policy: 'length', required: 12 }` |
| `TermsNotAccepted` | 422 | sign-up без acceptedTerms |
| `ReauthTokenInvalid` | 401 | X-Reauth-Token wrong / consumed |
| `ReauthTokenExpired` | 401 | 5 min TTL истёк |
| `SocialAuthFailed` | 401 | provider не подтвердил (wrong HMAC, expired token) |
| `ProviderAccountLinked` | 409 | этот provider account уже привязан к другому local user |

---

<a id="event-listening"></a>
## Cross-cutting: Event listening

`KeycloakEventListenerService` подхватывает события из Keycloak Events API и emit'ит наши domain events:

| Keycloak event type | Наш domain event | Что делает |
|---|---|---|
| `LOGIN` | `UserSignedInEvent` (already exists) | Обновляет lastLoginAt |
| `REGISTER` | `UserCreatedEvent` (new) | Postgres shadow user create |
| `UPDATE_EMAIL` | `EmailChangedEvent` (new) | Postgres update email |
| `VERIFY_EMAIL` | `EmailVerifiedEvent` (already exists) | Postgres set emailVerifiedAt + status='active' |
| `UPDATE_PROFILE` | `UserProfileUpdatedEvent` (new) | Postgres update firstName/lastName |
| `UPDATE_PASSWORD` | `PasswordChangedEvent` (new) | Audit log |
| `DELETE_ACCOUNT` | `UserDeletedEvent` (new) | Cascade delete в Postgres |
| `IDENTITY_PROVIDER_LINK_ACCOUNT` | `IdentityProviderLinkedEvent` (new) | Postgres shadow federated identity |

**Реализация:** REST polling `/admin/realms/{realm}/events?dateFrom=...` каждые 30s. State `lastPolledAt` в Redis. Production-grade — SPI Java event listener (отдельная задача).

---

<a id="testing"></a>
## Cross-cutting: Testing strategy

### Unit tests (per Use Case)
- `SignUpEmailUseCase` — mock KeycloakAdminClient, проверить вызовы `users.create` + `sendVerifyEmail`, error mapping
- `OtpService.generate` / `verify` — Redis-mocked, argon2 verify, attempts increment, rate limit
- `TokenExchangeService.exchangeForUser` — mock HTTP, валидный TokenPair

### Integration tests (per endpoint)
- Spin up testcontainers: Keycloak + Postgres + Redis + Mailpit
- Жизненный цикл: sign-up → verify (mock Keycloak event) → login → change email → forgot password → reset → login again
- Использовать Jest + supertest + @testcontainers/postgresql + @testcontainers/redis

### Contract tests
- OpenAPI / Swagger описание всех endpoints
- Frontend MSW моки генерируются из той же Zod-схемы DTO

---

<a id="production"></a>
## Production readiness checklist

### Infrastructure
- ✅ Keycloak HA (минимум 2 instances + shared Postgres DB)
- ✅ Realm export для CI/CD reproducibility (`kc.sh export --realm app --file /opt/realm-export.json`)
- ✅ SMTP provider (production: SES / SendGrid; не Mailpit)
- ✅ SMS provider (Twilio production credentials)
- ✅ Redis HA для OTP / reauth tokens
- ✅ Secrets через vault (HashiCorp Vault / AWS Secrets Manager)

### Security
- ✅ Все service account secrets ротируются (90 days)
- ✅ TLS 1.3 only (strict-transport-security 1y)
- ✅ CSP headers (запрет inline scripts кроме Keycloak realm)
- ✅ Rate-limiting на все public endpoints (через `@nestjs/throttler` + Redis)
- ✅ CAPTCHA (Keycloak Recaptcha policy) на public sign-up
- ✅ Anti-enumeration соблюдён везде где описано
- ✅ Audit logs Keycloak Events → SIEM (Splunk / ELK)
- ✅ Backup Keycloak DB + realm config

### Monitoring
- ✅ Metrics: signup_success, signup_failure, otp_send_rate, otp_verify_success/failure, login_failure
- ✅ Alerts:
  - OTP send rate spike (potential abuse)
  - Login failure rate spike (brute force)
  - Keycloak Admin API errors (service-account expired?)
  - SMS provider quota exhausted
- ✅ Distributed tracing (OpenTelemetry) — trace registration end-to-end

### Documentation
- ✅ ADR'ы committed: 0009 (form), 0010 (OTP), 0011 (error coding), 0012 (social), 0013 (contact change), 0014 (Keycloak hybrid)
- ✅ `docs/integration-backend.md` обновлён под фактический контракт
- ✅ Runbook для on-call: «как diagnostic'ить OTP не приходит», «как unlock locked-out user», «как rotate service account secret»

### Compliance
- ✅ Privacy Policy / Terms of Service URLs встроены в registration форму (checkbox с link'ами)
- ✅ Cookie consent banner (если EU traffic)
- ✅ GDPR: data export (`GET /users/me/export`), account deletion (через Account Console)
- ✅ Retention policy: account inactive ≥3 years → auto-anonymize (custom job)
- ✅ ФЗ-152 (если РФ): локализация PD на территории РФ (Keycloak Postgres в RU region)

---

## Связанные документы

- [auth-roadmap.md](auth-roadmap.md) — timeline + milestones
- [integration-backend.md](integration-backend.md) — текущий контракт + раздел «planned» обновляется по мере фаз
- [plan-файл](C:/Users/vim/.claude/plans/10-luminous-mist.md) — полная архитектура

## История изменений

- **2026-06-03** — v1 (initial). Создан после одобрения plan-файла. Strategy C (Hybrid Keycloak Admin). Базируется на текущем `njs-server` state (NestJS + Keycloak 24+ + Prisma + Redis + axios). Backend dev должен прочитать целиком до начала Phase 0.
