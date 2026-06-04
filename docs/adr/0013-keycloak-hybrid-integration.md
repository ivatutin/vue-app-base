# 0013. Keycloak Hybrid Integration (Strategy C)

- **Status:** accepted
- **Date:** 2026-06-03

## Context

Backend `njs-server` использует Keycloak 24 как IdP — но **только для login** (password grant + JWT validation). Регистрация, верификация, change-contact, social — отсутствуют. С учётом плана Auth/Registration suite ([auth-roadmap.md](../auth-roadmap.md)) встаёт принципиальный вопрос: **какая боундари между Keycloak и нашим backend кодом**?

Три рассмотренные стратегии (детальный анализ — в plan-файле):

- **Strategy A — Custom auth-слой**: backend сам управляет регистрацией / email verification / password reset / social. Keycloak — только storage. **Anti-pattern**: дублирует существующий функционал Keycloak (password policy, brute force, audit, i18n, magic links).
- **Strategy B — Pure OIDC**: frontend делает redirect на Keycloak self-registration page. Standards-compliant, но UX disruption (пользователь покидает SPA), требует Keycloak FTL theme branding, phone/VK/Yandex/Telegram всё равно требуют Keycloak Java SPI.
- **Strategy C — Hybrid Keycloak Admin** (выбрано): backend под капотом использует **Keycloak Admin REST API**, frontend остаётся single-page (свои формы, без redirect). Custom код пишем только там где Keycloak нативно не поддерживает (phone-OTP без Java SPI, Telegram, single-page change-contact UX).

## Decision

**Strategy C (Hybrid Keycloak Admin)** как принципиальная архитектура auth-слоя.

**Принцип:** делегируем Keycloak максимум того, что он делает нативно. Custom код пишем только там, где нативной поддержки нет.

### Boundary table (кто что делает)

| Capability | Где | Backend технология |
|---|---|---|
| **Email signup** | Keycloak Admin API | `keycloakAdmin.users.create({email, credentials, requiredActions: ['VERIFY_EMAIL']})` |
| **Email verification** | **Keycloak `sendVerifyEmail`** (magic link) | `users.sendVerifyEmail(id)` |
| **Phone signup** | Наш OTP + Keycloak Admin | OTP verify → `users.create({attributes: {phoneNumber, phoneVerified: 'true'}, credentials: []})` |
| **Phone verification** | **Наш** OTP service | Keycloak не имеет нативного phone-OTP без Java SPI |
| **Password storage / policy** | **Keycloak realm Password Policy** | NIST-compliant: length(12), no expiration, no composition rules |
| **Login email+password** | Keycloak password grant | существующий pattern |
| **Login phone+OTP** | Наш OTP verify + **Keycloak Token Exchange (RFC 8693)** | service-account token exchange `requested_subject=keycloakId` |
| **Login refresh** | Keycloak | существующий refresh-mutex |
| **Forgot password** | **Keycloak Required Action** | `users.executeActionsEmail(id, ['UPDATE_PASSWORD'])` |
| **Change password (frequent)** | Backend re-auth + Keycloak Admin | `users.resetPassword(...)` |
| **Change password (forgot-style)** | **Keycloak Required Action** | `executeActionsEmail(['UPDATE_PASSWORD'])` (без re-auth) |
| **Change email** | Наш OTP + Keycloak Admin | OTP → `users.update({email, emailVerified: true})` |
| **Change phone** | **Наш** OTP + Keycloak Admin | OTP → `users.update({attributes})` |
| **Brute force** | **Keycloak realm** | Brute Force Detection settings |
| **CAPTCHA** | **Keycloak realm** | Recaptcha policy |
| **Audit logs (auth)** | **Keycloak Events API** | `/admin/realms/{realm}/events`, не свой audit_log |
| **i18n auth pages** | **Keycloak ru locale** | нативно |
| **Google / GitHub / Apple** | **Keycloak Identity Brokering** | нативно, frontend redirect `?kc_idp_hint=google` |
| **VK ID / Yandex** | **Keycloak Generic OIDC IdP** (попытка), fallback custom | VK ID + Yandex поддерживают OIDC. Setup как Generic OIDC. Fallback: `addFederatedIdentity` |
| **Telegram** | **Custom backend** | Login Widget HMAC validate + Bot OTP (Keycloak нативно не поддерживает) |
| **Manage sessions** | **Keycloak Account Console** | link `/realms/{realm}/account/#/device-activity` |
| **Linked accounts** | **Keycloak Account Console** | link `/account/#/linked-accounts` |
| **Delete account (GDPR)** | **Keycloak Account Console** + Postgres cascade | event listener ловит `DELETE_ACCOUNT` |
| **MFA TOTP** (future) | **Keycloak Required Action** | `CONFIGURE_TOTP` |
| **Passkeys** (future) | **Keycloak WebAuthn Policy** | Required Action `webauthn-register` |

### Backend prerequisites

#### Keycloak Realm Configuration
- SMTP в realm (Mailpit для dev, SES/SendGrid для prod) — критично для email verify + forgot password + change email
- Password Policy: `length(12)`, no expiration, no composition (NIST)
- Brute Force Detection: 5 failures → 5min wait
- Internationalization: ru, en; default ru
- User Profile: добавить attributes `phoneNumber` (E.164 regex) и `phoneVerified`
- Token Exchange: enabled (RFC 8693) для phone-login и custom social
- Identity Providers: Google/GitHub нативно; VK ID + Yandex как Generic OIDC

#### Service Account (Client `app-backend`)
- Service accounts enabled
- Roles: `realm-management/manage-users`, `view-users`, `query-users`, `manage-identity-providers`, `view-events`

#### NestJS Modules
- `@keycloak/keycloak-admin-client` (npm)
- `KeycloakAdminService` — singleton client, admin token cache в Redis (TTL `expiresIn - 30s`)
- `KeycloakEventListenerService` — REST polling `/admin/realms/{realm}/events` каждые 30s (production: SPI Java event listener pushes webhook)
- `OtpService` — Redis storage с argon2id hash, SMS provider abstraction
- `TokenExchangeService` — для phone-login и social

### Sync via Keycloak Events

| Keycloak event | Наш domain event | Action |
|---|---|---|
| `LOGIN` | UserSignedInEvent (existing) | update lastLoginAt |
| `REGISTER` | UserCreatedEvent (new) | Postgres shadow user create |
| `UPDATE_EMAIL` | EmailChangedEvent (new) | Postgres update email |
| `VERIFY_EMAIL` | EmailVerifiedEvent (existing) | Postgres set emailVerifiedAt + status='active' |
| `UPDATE_PROFILE` | UserProfileUpdatedEvent (new) | Postgres update first/lastName |
| `UPDATE_PASSWORD` | PasswordChangedEvent (new) | Audit log |
| `DELETE_ACCOUNT` | UserDeletedEvent (new) | Cascade delete в Postgres |
| `IDENTITY_PROVIDER_LINK_ACCOUNT` | IdentityProviderLinkedEvent (new) | Postgres shadow federated identity |

### Frontend impact

**ZERO.** Все frontend phases (0-5) работают с одним и тем же API-контрактом независимо от того, как именно backend это реализует. Контракт зафиксирован в [docs/integration-backend.md](../integration-backend.md) (раздел «Auth endpoints planned») и в [docs/backend-auth-implementation.md](../backend-auth-implementation.md).

## Consequences

### Положительные

- **Минимум custom security кода**: password policy, brute force, breach DB, audit, email templates, i18n, CAPTCHA — всё Keycloak настройками
- **Single-page UX**: пользователь не покидает SPA для registration/verify/change (кроме Account Console для advanced ops — sessions/delete/2FA)
- **Standards alignment**: OAuth 2.1, OIDC, OAuth Token Exchange (RFC 8693) — везде где можем
- **Будущая расширяемость**: Google/GitHub добавляются через Identity Brokering без кода; MFA/Passkeys — через Required Actions
- **Audit trail**: Keycloak Events API для всех auth-событий — не плодим свой audit_log table

### Отрицательные

- **Boundary maintenance**: эта таблица — контракт, который нужно поддерживать. При добавлении новой capability — решение «нативно Keycloak или custom?» — обязательно через update этого ADR.
- **Backend complexity**: NestJS должен интегрировать Keycloak Admin Client (~150 строк infra) + Event Listener (~100 строк) + Token Exchange (~50 строк).
- **Token Exchange — Community Edition**: доступен в Keycloak 24+ Community, но требует enabled в realm config + client permissions. Митигация — fallback на Direct Naked Impersonation если Token Exchange ограничен.
- **VK ID / Yandex Generic OIDC** — пока не подтверждено что Keycloak полностью справится с их особенностями (specific scopes, token format). Если fail → custom backend endpoint + `addFederatedIdentity`. Заложен +2 дня в Phase 3 risk register.
- **Phone-OTP остаётся custom**: Keycloak нативно не поддерживает SMS OTP без Java SPI. Custom OtpService — стандартное решение для команд без Java.

### Что меняется в коде

- **Phase 0**:
  - Backend: KeycloakAdminService, KeycloakEventListenerService, OtpService, TokenExchangeService
  - Frontend: ничего auth-specific (foundation phase)
- **Phase 1-5**: каждый endpoint внутри использует Keycloak Admin (см. [backend-auth-implementation.md](../backend-auth-implementation.md) per-endpoint specs)

### Что НЕ меняется

- **Login email+password** остаётся через Keycloak password grant (текущий pattern). Не переписываем на Authorization Code Flow в этой инициативе.
- **HTTP-клиент** ([ADR-0006](0006-fetch-based-http-client.md)) — refresh-mutex продолжает работать с Keycloak refresh tokens.
- **TanStack Query** ([ADR-0008](0008-tanstack-query-for-server-state.md)) — `useCurrentUserQuery` использует тот же `GET /users/me`, backend под капотом возвращает Keycloak user + Postgres shadow.

## Альтернативы (для истории)

### Strategy A — Custom auth-слой

Не выбран. Anti-pattern: дублирует Keycloak password policy / brute force / breach check / audit / email templates / i18n. Команда пишет 1000+ строк security-critical кода вместо realm settings checkbox'ов.

### Strategy B — Pure OIDC через Keycloak

Не выбран. Преимущества (standards-compliance, минимум кода) есть, но:
- UX disruption — пользователь покидает SPA на момент signup/verify/reset
- Брендинг Keycloak требует FTL theme + CSS (отдельный Maven artifact или volume mount)
- **Phone-OTP, VK ID, Yandex, Telegram в Keycloak не нативны** — всё равно требуют SPI Java extensions для полноценной интеграции (но через SPI они «как Keycloak», не custom backend)
- Требует переделки login (отказ от password grant → Authorization Code Flow + PKCE) — большой refactor

Strategy C даёт **best of both worlds**: single-page UX + Keycloak делает где может.

### Полностью отказаться от Keycloak

Не рассматривалось серьёзно. Keycloak уже стоит, RBAC через roles, password storage, JWT validation — миграция = переписать всё.

### Auth0 / Clerk / SuperTokens

Managed-IdP — outside текущей инфраструктуры (бизнес-решение остаться на self-hosted Keycloak). Если когда-то понадобится migrate — Strategy C даёт чистую boundary («что Keycloak делает» легко выделяется).

## Связанные ADR / документы

- [ADR-0006](0006-fetch-based-http-client.md) — HTTP-клиент (refresh-mutex для Keycloak tokens)
- [ADR-0010](0010-form-architecture-vee-validate-zod.md) — Form architecture
- [ADR-0011](0011-otp-verification-model.md) — OTP model (phone-OTP custom, email через Keycloak magic link)
- [ADR-0012](0012-error-coding-contract.md) — Error coding (Keycloak errors mapped в наши errorName)
- [auth-roadmap.md](../auth-roadmap.md) — phases 0-5 timeline
- [backend-auth-implementation.md](../backend-auth-implementation.md) — per-endpoint specs (Keycloak Admin calls)
- [docs/integration-backend.md](../integration-backend.md) — API контракт + раздел «planned»
