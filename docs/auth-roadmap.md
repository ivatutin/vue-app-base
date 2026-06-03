# Auth / Registration Roadmap

> Дорожная карта реализации auth/registration suite. Полная архитектура — в [plan-файле](C:/Users/vim/.claude/plans/10-luminous-mist.md), детальный backend-контракт — в [backend-auth-implementation.md](backend-auth-implementation.md).

## Цель

Закрыть 5 функциональных требований:
1. Регистрация через **email** (Keycloak magic link verification)
2. Регистрация через **телефон** (passwordless, our OTP service)
3. Регистрация через **Telegram, VK ID, Yandex** (Generic OIDC через Keycloak где возможно, custom где нет)
4. Подтверждение email/phone для existing users (verify-flow)
5. Смена email/phone для существующих verified-контактов (re-auth + double OTP)

**Архитектурная стратегия:** Strategy C (Hybrid Keycloak Admin). Frontend single-page, backend под капотом использует Keycloak Admin API. Custom код — только там где Keycloak не нативен (phone-OTP, Telegram, single-page change-contact UX).

---

## Phases overview

| Phase | Что закрывает | Frontend effort | Backend effort | Calendar |
|---|---|---|---|---|
| **0** | Foundation: формы, OTP infrastructure, error coding, Keycloak setup | M | L | 5-7 дней |
| **1** | Email registration + verification (Keycloak magic link) | M | M | 3-4 дня |
| **1.5** | Forgot password (Keycloak Required Action) | S | S | 1-2 дня |
| **2** | Phone registration + Phone OTP login | M | M | 4-5 дней |
| **3** | Social: VK ID + Yandex (Generic OIDC) + Telegram (custom) | L | M | 5-7 дней |
| **4** | Account security: verify + change email/phone + password + Account Console links | M | M | 4-5 дней |
| **5** | Docs polish + integration tests + `/docs-check` | S | S | 1-2 дня |

**Размерность:** S = ≤2 дня, M = 3-5 дней, L = 6+ дней. Расчёт на одного fullstack dev'а full-time.

**Итого:** ~3-4 недели календарной работы при последовательном выполнении. ~2 недели при параллелизации фаз 2/3/4 (после готовности Phase 1).

---

## Dependency graph

```
Phase 0 (foundation)
   │
   ├─→ Phase 1 (email signup) ─────┐
   │                                │
   │     ┌─→ Phase 1.5 (forgot pwd) │
   │     │                           │
   │     ├─→ Phase 2 (phone signup)  │
   │     │                           ├─→ Phase 5 (docs polish)
   │     ├─→ Phase 3 (social)        │
   │     │                           │
   │     └─→ Phase 4 (security page) ┘
   │
   └─→ Backend Phase 0 (Keycloak realm setup, NestJS modules) → разблокирует все Phase 1+ backend tasks
```

**Параллелизация:** после Phase 1 ready (frontend + backend), фазы 2/3/4 можно вести независимо тремя worker'ами. Phase 1.5 — самая маленькая, выполняется одним dev'ом параллельно остальным.

---

## Milestones

### M0 — Foundation Ready (после Phase 0)

**Frontend:**
- VeeValidate интегрирован в `<Form>` и `<TextField>`
- Компоненты `<OtpInput>`, `<PasswordInput>`, `<PhoneInput>`, `<Tabs>` готовы и в Storybook
- `entities/otp-challenge` FSM-store + API контракт, MSW-моки работают
- `entities/auth-provider` scaffold
- `shared/api/error-codes.ts` с registry + `matchError`
- 4 новых ADR (0009, 0010, 0011, 0014) приняты

**Backend:**
- Keycloak realm настроен (SMTP, password policy, brute force, ru locale, user attributes для phone)
- `KeycloakAdminService` + `KeycloakEventListenerService` + `OtpService` в NestJS
- Token Exchange enabled
- Service account с правами `realm-management/manage-users`
- SMS provider в dev-режиме (Twilio test mode / Mailpit)

**Acceptance:** `npm run dev` + MSW моки → можно протестировать send/verify OTP с фронта без реального backend; backend dev может вызывать `keycloakAdmin.users.create({...})` интерактивно.

### M1 — Email Registration Live (после Phase 1)

**Frontend:**
- `/auth/register-email` — wizard email + password + terms
- `/auth/verify-email` — экран «Проверьте почту» с polling `/users/me` + resend button
- Router guard блокирует `/dashboard` для `pending_verification` users
- LoginPage имеет ссылку «Создать аккаунт»

**Backend:**
- `POST /auth/sign-up/email` — `keycloakAdmin.users.create({requiredActions: ['VERIFY_EMAIL']})` + `sendVerifyEmail`
- Event listener подхватывает Keycloak `VERIFY_EMAIL` event → обновляет Postgres shadow user
- `POST /auth/verify-email/resend` — повторная отправка magic link

**Acceptance:** Регистрируется реальный user, приходит email от Keycloak, клик активирует аккаунт, frontend автоматически переходит на `/dashboard`.

### M1.5 — Password Recovery Live (после Phase 1.5)

**Frontend:**
- `/auth/forgot-password` — простая форма (email) + landing «Письмо отправлено»

**Backend:**
- `POST /auth/forgot-password` → `keycloakAdmin.users.executeActionsEmail([UPDATE_PASSWORD])` (anti-enumeration: всегда 202)

**Acceptance:** Пользователь забыл пароль → получает magic link → задаёт новый → может войти.

### M2 — Phone Auth Live (после Phase 2)

**Frontend:**
- `/auth/register-phone` — phone input + OTP (passwordless)
- LoginPage расширен tabs «Email» / «Телефон», phone-tab делает OTP login
- `<OtpInput>` интегрирован с phone WebOTP API (auto-fill из SMS)

**Backend:**
- `POST /auth/otp/send` / `verify` для phone channel — SMS provider integrated
- `POST /auth/sign-up/phone` — `keycloakAdmin.users.create({attributes: {phoneNumber, phoneVerified}, credentials: []})`
- `POST /auth/sign-in/phone` — Token Exchange (RFC 8693) для получения TokenPair от service-account

**Acceptance:** Реальный SMS приходит на phone, OTP вводится, user логинится / регистрируется через phone.

### M3 — Social Auth Live (после Phase 3)

**Frontend:**
- `<SocialLoginButtons>` widget на LoginPage и Register pages
- `entities/auth-provider` реестр заполнен (vkid, yandex, telegram-widget, telegram-bot)
- `/auth/callback/[provider]` универсальный обработчик OAuth callback
- `/auth/complete-profile` для Telegram-only users без email

**Backend:**
- VK ID + Yandex настроены как Generic OIDC Identity Providers в Keycloak (попытка #1)
- Если Generic OIDC не справился → custom `POST /auth/providers/vkid/callback` + `addFederatedIdentity`
- Telegram — custom (Login Widget HMAC validate + Bot OTP integration через Telegram Bot API)

**Acceptance:** Кнопки социальных провайдеров работают на login + register pages. После login через любой social user попадает в `/dashboard` (или `/auth/complete-profile` если нет email/phone).

### M4 — Account Management Live (после Phase 4)

**Frontend:**
- `/account/security` — секции email row, phone row, change password, set password (для passwordless)
- Каждая секция использует свой flow (changeContactFlow / changePasswordFlow / setPasswordFlow)
- Links на Keycloak Account Console для advanced features (sessions, linked accounts, 2FA, delete)

**Backend:**
- `POST /auth/reauth` (5-min reauthToken)
- `POST /users/me/contact-change/{request,verify,cancel}`
- `POST /users/me/password` (с reauthToken)
- Event listener обрабатывает Keycloak `DELETE_ACCOUNT` event → cascade в Postgres

**Acceptance:** Existing user может: подтвердить unverified phone/email, сменить verified email (через OTP на старый + новый), сменить пароль (с re-auth), установить пароль если passwordless, перейти в Account Console для управления сессиями и удаления аккаунта.

### M5 — Production Ready (после Phase 5)

- Все docs синхронизированы (`/docs-check` clean)
- Integration tests покрывают critical paths
- ROADMAP.md обновлён (фазы closed)
- 4 ADR + backend implementation doc обновлены под фактическую реализацию
- README + CLAUDE.md описывают auth архитектуру

---

## Acceptance criteria по Phase

### Phase 0
- ✅ `npm run lint` + `type-check` + `test` + `build` green
- ✅ Все `<OtpInput>`, `<PhoneInput>`, `<PasswordInput>` в Storybook
- ✅ ≥3 новых unit-теста (otp-challenge store, password schema, error-codes)
- ✅ MSW handlers работают: `npm run dev` + `VITE_USE_MSW=true` → OTP send/verify через моки
- ✅ ADR-0009, ADR-0010, ADR-0011, ADR-0014 committed
- ✅ `docs/integration-backend.md` — раздел «Auth endpoints planned» добавлен
- ✅ Backend: `KeycloakAdminService` создаёт test-user через `users.create` + удаляет (интегр. тест)

### Phase 1
- ✅ Регистрация через `/auth/register-email` создаёт реального user в Keycloak realm
- ✅ Magic link приходит на email (тестируется через Mailpit в dev)
- ✅ После клика — frontend автоматически переключается с `/auth/verify-email` на `/dashboard` (через polling)
- ✅ Router guard блокирует pending user от `/dashboard` напрямую
- ✅ Тесты: `signupEmailFlow`, `verifyContactFlow`, smoke `RegisterEmailPage`

### Phase 1.5
- ✅ Forgot password flow работает end-to-end
- ✅ Anti-enumeration: одинаковый ответ для существующего и несуществующего email
- ✅ Magic link от Keycloak позволяет установить новый пароль через Keycloak page

### Phase 2
- ✅ Регистрация через `/auth/register-phone` создаёт user (passwordless)
- ✅ SMS реально приходит (Twilio test number / SMS.ru sandbox в dev)
- ✅ Phone login через LoginPage tabs работает
- ✅ WebOTP API авто-заполняет OTP на Android (manual test)
- ✅ Тесты: `signupPhoneFlow`, `loginPhoneFlow`

### Phase 3
- ✅ Хотя бы один из {VK ID, Yandex} работает через Generic OIDC в Keycloak (без custom backend)
- ✅ Telegram Login Widget работает на desktop
- ✅ Telegram Bot OTP работает на mobile
- ✅ После регистрации через Telegram (без email) — frontend ведёт на `/auth/complete-profile`
- ✅ Тесты: `socialLoginFlow`, mocked SDK для каждого провайдера
- ✅ ADR-0012 committed

### Phase 4
- ✅ Verified email/phone меняется через double OTP (старый + новый)
- ✅ Unverified — только OTP на новый
- ✅ Change password требует re-auth с current password
- ✅ Set password (passwordless user) работает через OTP на phone
- ✅ Links на Account Console открываются
- ✅ Тесты: `changeContactFlow` (все FSM-переходы), `changePasswordFlow`, `setPasswordFlow`
- ✅ ADR-0013 committed

### Phase 5
- ✅ `/docs-check` → 0 🔴
- ✅ Integration test suite (Playwright opt.) покрывает: register email → verify → login → change phone → logout
- ✅ Production checklist: SMTP provider настроен (SES/SendGrid), SMS provider настроен (Twilio production), Keycloak HA, secrets через vault

---

## Параллелизация и worker assignment

**Минимальный team-size:** 1 fullstack dev (3-4 недели календарной).

**Оптимально:** 1 frontend + 1 backend dev параллельно (~2 недели).

**Worker assignment (если 2 dev'а):**

```
Week 1-2:  Phase 0 (frontend + backend parallel)
Week 2-3:  Phase 1 (frontend + backend parallel)
           Phase 1.5 (backend solo, фронт-форма параллельно)
Week 3-4:  Phase 2 / Phase 3 / Phase 4 (любые два параллельно)
Week 4:    Phase 5
```

**Если 3 dev'а:**

```
Week 1-2:  Phase 0 → Phase 1
Week 3:    Phase 2 + Phase 3 + Phase 4 параллельно (3 worker'а)
Week 4:    Phase 5 + integration tests
```

---

## Risk register

| Риск | Вероятность | Impact | Mitigation |
|---|---|---|---|
| **Generic OIDC для VK/Yandex не работает** | Средняя | Средний | Fallback на custom backend endpoint + addFederatedIdentity. Заложить +2 дня на Phase 3 |
| **Token Exchange в Keycloak требует Enterprise** | Низкая | Высокий | Token Exchange доступен в Community Edition Keycloak 24+. Если не работает — DirectNakedImpersonation как fallback (требует осторожности с security) |
| **SMS provider quota / cost** | Средняя | Средний | Twilio dev-mode для разработки. Production — выбрать провайдера по unit-economics (Twilio US, SMS.ru РФ, AWS End User Messaging Asia). Бюджет $0.005-0.05/OTP |
| **Phone-as-username collision в Keycloak** | Низкая | Низкий | Используем UUID как username, phone в attribute. Lookup по phone — в нашем Postgres |
| **Backend dev не знаком с Keycloak Admin API** | Средняя | Средний | Backend instruction (`docs/backend-auth-implementation.md`) включает примеры всех Keycloak Admin вызовов. Onboarding-сессия — 2 часа |
| **Account Console branding отнимает время** | Средняя | Низкий | Использовать default Keycloak theme на старте; кастомизация — отдельная задача после Phase 5 |
| **WebOTP API не работает на iOS** | Высокая | Низкий | Apple не поддерживает WebOTP полноценно. На iOS — manual OTP entry (стандарт). Документировано в `<OtpInput>` |
| **Phone-OTP race condition при resend** | Средняя | Низкий | FSM-store `useOtpChallengeStore` блокирует resend по cooldown. Backend invalidate'ит старый challenge при создании нового |
| **Email magic link expires (по Keycloak default 5 min)** | Высокая | Низкий | UX message «Ссылка действительна 5 минут». Кнопка resend всегда доступна. В Keycloak можно настроить дольше (до 24h) |
| **MSW моки расходятся с реальным backend** | Средняя | Высокий | MSW handlers генерируются из той же Zod-схемы DTO что и production fetch. Контракт-тесты в Phase 5 (Playwright против real backend) |

---

## Когда уходим от MSW моков

MSW моки активируются через `VITE_USE_MSW=true` в `.env.local`. После того как backend endpoint **реально работает** (smoke-проверено):

1. Frontend: удалить handler для этого endpoint из `src/shared/lib/msw/handlers/auth.ts`
2. Frontend dev переключает `VITE_USE_MSW=false` локально (или удаляет vars)
3. Документация: обновить `docs/integration-backend.md` отметкой "✅ implemented" на этом endpoint

Можно работать в **hybrid режиме** — часть endpoint'ов мокирована, часть реальная (если backend dev ещё не закончил все).

---

## Что НЕ в scope текущей дорожной карты

Будущие фазы (после Phase 5), требуют отдельного планирования:

| Тема | Когда | Какой Keycloak механизм |
|---|---|---|
| MFA (TOTP) | По бизнес-триггеру | Required Action `CONFIGURE_TOTP` + Account Console |
| Passkeys (WebAuthn) | По бизнес-триггеру | Realm WebAuthn Policy + Required Action `webauthn-register` |
| Email/phone change без re-auth (force admin approval) | Enterprise feature | Custom backend approval workflow |
| Magic link для passwordless email login (не registration) | Если consumer-focused | Keycloak Magic Link extension (community) |
| Account merge при federated identity collision | По мере роста user-base | Custom backend logic |
| Personal data export (GDPR full) | Compliance request | Custom endpoint `GET /users/me/export` (Keycloak data + Postgres dump) |
| Audit log UI (admin-side) | После 50+ users | Custom UI поверх Keycloak Events API |
| Account Console theming (FTL) | После M5 | Отдельная backend / DevOps задача |
| Java SPI для VK/Yandex/Telegram | Если Generic OIDC fail и нужен deep custom | Maven + Keycloak SDK + custom JAR deployment |

---

## Связанные документы

- [plan-файл](C:/Users/vim/.claude/plans/10-luminous-mist.md) — полная архитектура с детальными фазами
- [docs/backend-auth-implementation.md](backend-auth-implementation.md) — spec-level инструкция для backend
- [docs/integration-backend.md](integration-backend.md) — текущий backend контракт + раздел «planned endpoints» обновляется по мере фаз
- ADR'ы будут созданы в Phase 0:
  - ADR-0009 — Form architecture (VeeValidate + Zod)
  - ADR-0010 — OTP-based verification model (phone-only, email через Keycloak magic link)
  - ADR-0011 — Error coding contract
  - ADR-0014 — Keycloak Hybrid Integration (Strategy C)
- ADR-0012 в Phase 3 — Social provider abstraction
- ADR-0013 в Phase 4 — Contact change challenge model
