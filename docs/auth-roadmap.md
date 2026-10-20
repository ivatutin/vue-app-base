# Auth / Registration Roadmap

> Дорожная карта реализации auth/registration suite. Детальный backend-контракт — в [backend-auth-implementation.md](backend-auth-implementation.md).

> ⚠️ **Исходный plan-файл утрачен.** Документ писался как выжимка из внешнего плана (`~/.claude/plans/10-luminous-mist.md`), которого больше не существует. Уцелевшие источники истины по архитектуре auth-suite: [ADR-0010](adr/0010-form-architecture-vee-validate-zod.md) (формы), [ADR-0011](adr/0011-otp-verification-model.md) (OTP-модель), [ADR-0012](adr/0012-error-coding-contract.md) (коды ошибок), [ADR-0013](adr/0013-keycloak-hybrid-integration.md) (Strategy C и boundary-таблица Keycloak) и [backend-auth-implementation.md](backend-auth-implementation.md). Детализация фаз 1-5, которой не было в ADR, восстановлению не подлежит — при возврате к работе планируй заново от этих документов.

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
- ✅ `entities/otp-challenge` — FSM-store + API-контракт + модели `shared/model/otp` (Phase 0, 16.10.2026; тесты: 13 store + 6 api)
- ~~`entities/auth-provider` scaffold~~ — исключено: соцвход вне объёма Auth v1 (решение координатора, 15.10.2026)
- `shared/api/error-codes.ts` с registry + `matchError`
- 4 новых ADR (0009, 0010, 0011, 0014) приняты

**Backend:**
- Keycloak realm настроен (SMTP, password policy, brute force, ru locale, user attributes для phone)
- `KeycloakAdminService` + `KeycloakEventListenerService` + `OtpService` в NestJS
- Token Exchange enabled
- Service account с правами `realm-management/manage-users`
- SMS provider в dev-режиме (Twilio test mode / Mailpit)

**Acceptance:** `npm run dev` против живого backend (`docker compose up -d postgres redis keycloak mailpit` + `npm run start:dev` в `njs-server`) → send/verify OTP проходит end-to-end, anti-enumeration видна в ответах; backend dev может вызывать `keycloakAdmin.users.create({...})` интерактивно.

### M1 — Email Registration Live (после Phase 1)

**Frontend:**
- `/auth/register` (табы «E-mail» / «Телефон»; email-таб — Phase 1, phone-таб — Phase 2) — email + password + terms
- `/auth/verify-email` — **статичный** экран «Проверьте почту» + маскированный email + `resend` (всегда `202`) + «войти».
  Polling **не делаем**: `sign-up/email` токенов не отдаёт (`{ user, verifyEmailSent }`), а `GET /users/me` protected —
  опрашивать нечем (решение координатора 16.10.2026, вариант A)
- параметры из письма экран **не принимает**: ссылка `VERIFY_EMAIL` уводит на страницу Keycloak и в приложение не
  возвращает (`send-verify-email` без `client_id`/`redirect_uri`) → `?verified=1` не заводим
- `verifyEmailSent === false` → отдельный текст «письмо не ушло, отправьте ещё раз»
- `409 ContactAlreadyExists` при повторном sign-up → тот же экран verify-email + `resend`, текст «аккаунт с таким адресом
  уже есть — проверьте почту» (для sign-up занятость показываем осознанно — как в `otp/send`)
- Router guard блокирует `/dashboard` для `pending_verification` users
- LoginPage имеет ссылку «Создать аккаунт»; `401` сразу после sign-up показываем подсказкой «проверьте почту»
  (не завязываться на точный код ошибки)

**Реализовано во фронте (16.10.2026):** `/auth/register` (табы, email-таб) и `/auth/verify-email` (статичный экран
с resend и ручным вводом адреса после перезагрузки), флоу `registerEmailFlow` + `resendVerifyEmailFlow`, примитив
`<Checkbox>` для `acceptedTerms`, состояние в `entities/auth` (`registration.store`, `maskEmail`).
Живая проба API: `201 { verifyEmailSent: true }`, письмо в Mailpit, `resend → 202` (и для несуществующего адреса — тоже
`202`, anti-enumeration). Прогон UI руками — за владельцем: e2e-инструментов в проекте пока нет (ROADMAP, Фаза 3).

**Backend:**
- `POST /auth/sign-up/email` — `keycloakAdmin.users.create({requiredActions: ['VERIFY_EMAIL']})` + `sendVerifyEmail`
- Event listener подхватывает Keycloak `VERIFY_EMAIL` event → обновляет Postgres shadow user
- `POST /auth/verify-email/resend` — повторная отправка magic link

**Acceptance:** Регистрируется реальный user, письмо `VERIFY_EMAIL` появляется в **Mailpit** (`http://localhost:8025`),
клик подтверждает аккаунт на странице Keycloak; после подтверждения вход по email/паролю даёт `status: active` и
`/dashboard`. Подтверждение в UI — попыткой входа (polling-а нет).

### M1.5 — Password Recovery Live (после Phase 1.5)

**Frontend:**
- `/auth/forgot-password` — простая форма (email) + landing «Письмо отправлено»

**Реализовано во фронте (16.10.2026):** `/auth/forgot-password` (два состояния: форма и «письмо отправлено» с маской
адреса и возвратом к правке), флоу `forgotPasswordFlow`, ссылка «Забыли пароль?» на логине и обработчик
`/auth/login?reset=success` (тост). Сегодня ссылка из письма ведёт на Keycloak и в приложение не возвращает — обработчик
оставлен заделом; `?reset=success` в состоянии «отправлено» не обещаем.

**Backend:**
- `POST /auth/forgot-password` → `keycloakAdmin.users.executeActionsEmail([UPDATE_PASSWORD])` (anti-enumeration: всегда 202)

**Acceptance:** Пользователь забыл пароль → получает magic link → задаёт новый → может войти.

### M2 — Phone Auth Live (после Phase 2)

**Frontend:**
- `/auth/register` (phone-таб) — phone input + OTP (passwordless)
- LoginPage расширен табами «E-mail» / «Телефон», phone-таб делает OTP login
- `<OtpInput>` интегрирован с phone WebOTP API (auto-fill из SMS)

**Реализовано во фронте (16.10.2026):** виджет `widgets/phone-verification` (номер → код → `verificationToken`, один на
регистрацию и вход), phone-таб в `/auth/register`, табы «E-mail» / «Телефон» на `/auth/login`, флоу
`registerPhoneFlow` / `loginPhoneFlow` и общий финал входа `establishSession` (вынесен из `loginFlow`, чтобы порядок
«токены → очистка кэша → профиль → компенсация» был один на все входы).

**Звонковый канал (Phase 2.5, там же):** в том же виджете переключатель «Код из SMS» / «Обратный звонок»; состояние
звонка — `entities/otp-challenge/model/phone-call.store.ts` (опрос `GET /auth/phone/call/:id` каждые 4 с, терминальные
состояния приходят `200 + status`, токен отдаётся через `awaitVerification()`, а не полем состояния). Живая приёмка
цепочки и особенность стенда (контейнер + хост на другом порту) — в `integration-backend.md`, § «Обратный звонок».
Осталось: WebOTP auto-fill на Android проверяется руками.

**Backend:**
- `POST /auth/otp/send` / `verify` для phone channel — SMS provider integrated
- `POST /auth/sign-up/phone` — `keycloakAdmin.users.create({attributes: {phoneNumber, phoneVerified}, credentials: []})`
- `POST /auth/sign-in/phone` — Token Exchange (RFC 8693) для получения TokenPair от service-account

**Acceptance:** Реальный SMS приходит на phone, OTP вводится, user логинится / регистрируется через phone.

### M3 — Social Auth Live (после Phase 3)

> ⛔ **Вне объёма Auth v1** (решение координатора, 15.10.2026): эндпоинтов на backend нет, работы не открываются.
> Раздел оставлен как план на случай пересмотра объёма.

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
- ⬜ **Брендинг Keycloak** (обязательный пункт, срок — после утверждения брендбука): страницы `login` /
  `login-verify-email` / `login-update-profile` / `login-reset-password` / `error` и письма (`email/`) приводятся
  к брендбуку кастомной темой (`themes/<name>/{login,email}` с `parent=keycloak`), тема монтируется в контейнер
  (`docker-compose.yml` volume), выбирается в realm (`loginTheme`), тексты — через localization (`messages_ru`).
  Сейчас в `njs-server/docker/keycloak/` только `Dockerfile` — тем нет, страницы дефолтные Keycloak.
- Integration tests покрывают critical paths
- ROADMAP.md обновлён (фазы closed)
- 4 ADR + backend implementation doc обновлены под фактическую реализацию
- README + CLAUDE.md описывают auth архитектуру

---

## Acceptance criteria по Phase

> **Как читать списки ниже.** Это **критерии приёмки** фаз (что должно быть выполнено), а не отчёт о статусе: `✅` в них —
> маркеры пунктов из исходного (утраченного) плана. Фактический статус на 19.10.2026: фронт Phase 0, 1, 1.5, 2, 2.5 и 4
> **реализован** (статусы — у разделов ниже, подтверждение — git-лог), Phase 3 — вне объёма Auth v1, backend Phase 0-2/2.5/4 —
> реализован и live-проверен. Источник по факту — ✅ у эндпоинтов в `docs/integration-backend.md` и git-лог.

### Phase 0

Статус на 16.10.2026: **M0.A и M0.B закрыты; M0.C закрыт по фронту** — `shared/model/otp` + `entities/otp-challenge` созданы и покрыты тестами (19), MSW-часть M0.C отменена (см. раздел «MSW не используется»).

- ✅ `npm run lint` + `type-check` + `test` + `build` green
- ✅ ADR-0010, ADR-0011, ADR-0012, ADR-0013 committed (M0.A)
- ✅ `docs/integration-backend.md` — раздел «Auth endpoints planned» добавлен
- ✅ Компоненты `<Form>`/`<TextField>`, `<Tabs>`, `<OtpInput>`, `<PasswordInput>`, `<PhoneInput>` реализованы и покрыты тестами (M0.B)
- ✅ Stories для `<OtpInput>`, `<PhoneInput>`, `<PasswordInput>`, `<Tabs>` написаны; сборка Storybook добавлена в CI
- ✅ Компоненты M0.B выведены в barrel `@/shared/ui/base`; инвариант закреплён тестом `public-api.test.ts`
- ⬜ Потребителей у компонентов M0.B по-прежнему нет — появятся на экранах Phase 1-2
- ✅ `entities/otp-challenge` (FSM-store + `api` + `schema`) и `shared/model/otp` созданы 16.10.2026; тесты — 19 (13 store + 6 api)
- ❌ `entities/auth-provider` — **не нужен**: соцвход вне объёма Auth v1 (решение координатора, 15.10.2026)
- ❌ MSW handlers — **не нужны**: решение пересмотрено 16.10.2026 (бэкенд готов, работаем против живого API), пакет `msw` не устанавливаем
- ✅ Backend auth-suite (OTP, звонковый канал, регистрация email/phone, Phase 4) реализован и проверен на живом стеке (16.10.2026)

### Phase 1
- ✅ Регистрация через `/auth/register` (email-таб) создаёт реального user в Keycloak realm
- ✅ Письмо `VERIFY_EMAIL` приходит (dev — **Mailpit**, `http://localhost:8025`)
- ✅ После подтверждения пользователь входит по email/паролю и попадает на `/dashboard` (polling-а нет, см. M1)
- ✅ Router guard блокирует pending user от `/dashboard` напрямую
- ✅ Тесты: `registerEmailFlow`, smoke `RegisterPage`; живая проверка доставки письма — «проверено с фронта <дата>»

### Phase 1.5
- ✅ Forgot password flow работает end-to-end
- ✅ Anti-enumeration: одинаковый ответ для существующего и несуществующего email
- ✅ Magic link от Keycloak позволяет установить новый пароль на странице Keycloak; возврат — `/auth/login?reset=success`

### Phase 2
- ✅ Регистрация через `/auth/register` (phone-таб) создаёт user (passwordless)
- ✅ SMS-код приходит (dev — `[dev-sms]` в логе бэкенда; звонковый канал — dev-заглушка ~15 с)
- ✅ Phone login через таб «Телефон» на `/auth/login` работает
- ✅ WebOTP API авто-заполняет OTP на Android (manual test)
- ✅ Тесты: `registerPhoneFlow`, `loginPhoneFlow`

### Phase 3
- ✅ Хотя бы один из {VK ID, Yandex} работает через Generic OIDC в Keycloak (без custom backend)
- ✅ Telegram Login Widget работает на desktop
- ✅ Telegram Bot OTP работает на mobile
- ✅ После регистрации через Telegram (без email) — frontend ведёт на `/auth/complete-profile`
- ✅ Тесты: `socialLoginFlow`, mocked SDK для каждого провайдера
- ✅ ADR-0012 committed

### Phase 4

Статус на 19.10.2026: **реализовано и проверено живьём** (приёмка с владельцем на стенде: 5/5 контейнеров healthy).
Отчёт координатору — `docs/coordination/questions/2026-10-19-live-acceptance-phase4.md`.

- ✅ `entities/contact-change` — `api` (`request` / `verify` / `cancel`, DTO — зеркало бэкенда) и FSM-store
  (`idle` → `codes`); `changeToken` живёт в сторе и переживает F5 через `sessionStorage` (нужен и `verify`, и `cancel`),
  коды — только в полях формы. Стадии `done` нет: успех сразу сбрасывает состояние (иначе «войдите заново»
  показывалось уже после входа)
- ✅ `processes/auth-flow`: `requestContactChangeFlow` (reauth → request; `ContactChangeAlreadyPending` → `cancel` →
  **новый** reauth → request, потому что reauth одноразовый), `verifyContactChangeFlow` (`200` = доступ отозван →
  локальная сессия сбрасывается; `503` = ничего не применено → сессия и токен смены живы),
  `cancelContactChangeFlow` (`ChangeTokenExpired` = «смены уже нет»), `changePasswordFlow` (reauth + `X-Reauth-Token`),
  `setPasswordFlow` (OTP `purpose=set-password`), `logoutAllFlow` (v1.4 — отзыв на всех устройствах)
- ✅ Экраны: `/account/profile` (имя/фамилия — редактирование только при праве `user.update`: `PATCH /users/:id/profile`
  админский) и `/account/security` (пароль «сменить/задать», карточка «Контакт», «Выйти на всех устройствах»)
- ✅ «Задать пароль»: у `PhoneVerificationForm` появились `initialPhone` / `lockPhone` — токен выдаётся только на свой номер
- ✅ Живая приёмка 19.10.2026: double OTP (старый + новый), `409` при занятом контакте, отзыв сессий после `verify`,
  повтор `request` после `cancel`, `logout-all`, смена пароля (в т.ч. неверный текущий), RBAC-guard через `/roles`
- ✅ По итогам приёмки исправлено: тексты 5xx без кода, утечка английского `HttpError.message`, поля имени на
  регистрации (Keycloak требует их у роли `user`), UX кодов (подписи/TTL/возврат к запросу при истечении),
  устаревшая стадия «готово»
- ✅ Звонковый канал проверен живьём 20.10.2026: `phone/call` → 200, статус `pending` → `verified` за ~20 с,
  `verificationToken` выдан. Схема проверки: host-приложение на 3001 + `CIBA_CHANNEL_URL=http://host.docker.internal:3001/...`
  для Keycloak (иначе CIBA стучится в контейнер, где dev-провайдер отказывает) — см.
  `docs/coordination/questions/2026-10-20-call-channel-verified.md`
- ⬜ Не проверено: `503` на `contact-change/verify` (гашение Keycloak во время подтверждения)
- ⬜ Открытые вопросы координатору: self-service `PATCH /users/me/profile` и синхронизация имён из Keycloak
- ⬜ Отдельного ADR по смене контакта на фронте нет: правила зафиксированы в `docs/integration-backend.md`
  § Account security (поведенческие следствия) и в JSDoc флоу
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

## Карта экранов фронта (зафиксирована 16.10.2026)

Принята координатором целиком (обоснование — `sessions/vue-app-base/questions/routes-and-screens-freeze.md`, ответ — `replies/routes-and-screens-freeze.md`).

| Маршрут | Экран | Заметки |
|---|---|---|
| `/auth/login` | вход | табы «E-mail» / «Телефон» + ссылки «Создать аккаунт», «Забыли пароль?» |
| `/auth/register` | регистрация | табы «E-mail» / «Телефон», диплинк `?tab=phone` |
| `/auth/verify-email` | «Проверьте почту» | **статичный**: `resend` (202) + «войти»; параметров из письма не принимает |
| `/auth/forgot-password` | сброс пароля | второе состояние экрана — «письмо отправлено»; после ссылки → `/auth/login?reset=success` |
| `/auth/logout` | «Вы вышли» | уже есть |
| `/account/profile` | профиль | имя/фамилия (`PATCH /users/:id/profile`) |
| `/account/security` | безопасность | пароль + смена контакта + «выйти на всех устройствах» + ссылки в Keycloak Account Console |

- **Экрана нового пароля нет** (`/auth/reset-password` не заводим): required action `UPDATE_PASSWORD` рисует Keycloak,
  возврат — `/auth/login?reset=success`. Та же логика, что у подтверждения email.
- `/account/*` — **без `meta.permissions`**: бэкенд отдаёт только Keycloak-роли, бизнес-permissions в токене нет →
  с `meta.permissions` обычный пользователь уедет на `/system/forbidden`. Достаточно авторизации.
- Кнопок соцпровайдеров нет (Phase 3 вне объёма); i18n не тянем — тексты по-русски.

### Решения до Phase 0 (согласованы 16.10.2026)

- Модели: новый `shared/model/otp/` — `OtpPurpose` (6 значений, дословно как на бэкенде) + `OtpDelivery = 'otp' | 'call'`
  (внутренний словарь UI; на проводе такого поля **нет** — канал различается эндпоинтом). В ответе
  `POST /auth/phone/call` бэкенд отдаёт собственное поле `method: 'call'` — это про ответ, а не про enum способа.
  `shared/model/contact-channel` не расширяем.
- Раскладка (реализовано в Phase 0): `entities/otp-challenge` (FSM, cooldown, `challengeId`, маскированный `target`,
  сохранённые параметры отправки для `resend`) → `processes/auth-flow` (сценарии) → `pages/auth/*` (UI). Слой `features`
  не заводим. **Счётчик попыток не ведём**: контракт его не отдаёт — UI реагирует только на состояние `locked`.
- `verificationToken` — **только in-memory** в рамках флоу (TTL 10 мин, одноразовый); в Pinia/storage не кладём.
  Побочный эффект принят осознанно: перезагрузка страницы начинает шаг заново.
- ADR: детали FSM и кросс-канального вытеснения — **amend ADR-0011** (поведение звонкового канала — ADR-0014);
  новый ADR не заводим, пока нет решения, которого там нет.

### Стенд и входные данные приёмки (обновлено 16.10.2026)

**Подъём для живой приёмки** (иначе часть каналов откажет «осознанно» и это будет выглядеть как дефект):

```
docker compose up -d postgres redis keycloak mailpit   # app НЕ поднимаем
npm run start:dev                                      # приложение с хоста, NODE_ENV=development
```

Контейнер `app` работает в `NODE_ENV=production` (перебивает `.env`) — там звонковый канал и письма смены контакта дают
`503` (fail-closed); SMS-код при этом пишется в лог, письма Keycloak идут в Mailpit. Если приложение уже поднято
контейнером — `docker compose stop app` (иначе конфликт портов 3001).

- **Звонковый канал + CIBA (нашёл 16.10.2026):** провайдер звонка требует приложения **с хоста**, но CIBA-минт токенов
  (ADR-0015) требует, чтобы **Keycloak** дозвонился до канала аутентификации, а его адрес прописан контейнерным
  (`http://app-backend:3001/api/v1/internal/ciba/channel` в `docker-compose.yml`). Значит, остановив контейнер ради
  порта 3001, мы ломаем `sign-up/phone` → `503`. Полный рецепт приёмки звонка: **контейнер `app` держим поднятым**, а
  хост-приложение поднимаем на другом порту — `set APP_PORT=3101 && npm run start:dev` (челленджи и метки минта живут в
  общем Redis, поэтому контейнер подтверждает заявку, начатую хостовым). Детали — `integration-backend.md`, § «Обратный
  звонок».

- Письма регистрации и сброса пароля шлёт **Keycloak** → **Mailpit** (`http://localhost:8025`, профиль `mail`).
- SMS-коды и коды смены контакта — в логе бэкенда (`[dev-sms]` / `[dev-email]`); звонок — `ConsolePhoneCallProvider`
  (подтверждает сам через `SMSRU_DEV_CONFIRM_AFTER_SECONDS`, 15 с). Ключ SMS.ru для приёмки не нужен.
- Политика пароля реалма: `length(10) and notUsername and notEmail`. `PasswordPolicyViolation.details.message` —
  **ключ/формулировка Keycloak, не готовый текст** → показываем свой текст, значение уходит в консоль.
- `POST /auth/sign-in` отдаёт **только токены** (`accessToken`, `refreshToken`, `expiresIn`) — роли и статус берём из
  `GET /users/me` (наш `loginFlow` так и делает).
- Вход при незакрытом `VERIFY_EMAIL` → `401 InvalidCredentials` (проверено живьём 16.10.2026): UI не завязывается на код,
  а показывает «проверьте почту».

**Dev-аккаунты для RBAC** (реалм-роли `admin`/`user` появились 16.10.2026 — блокер приёмки снят):

| Аккаунт | Роль | Для чего |
|---|---|---|
| `admin-dev@example.com` | `admin` | админские вызовы; создание `suspended`-пользователя (`POST /users/:id/suspend`) |
| `user-dev@example.com` | `user` | `403` / `/system/forbidden` у авторизованного без админ-роли |

Пароль — в координационном `handover/dev-accounts-and-stand.md`; **в репозиторий не переносим** (dev-секрет в git не
место). Роль попадает в токен только после **нового входа/refresh** — проверять на свежей сессии.

**Рецепт RBAC-проверки без создания данных:** несуществующий uuid (`00000000-0000-0000-0000-000000000001`) —
`GET /users/:id` как `admin-dev` → `404 UserNotFound` (гард пропустил), как `user-dev` → `403` (гард отсёк).

- Сидов нет: тестовые пользователи создаются реальными потоками и **удаляются за собой** (иначе drift-детектор даст
  `identity_missing`). На 16.10.2026 в теневой БД 1 строка при 4 пользователях Keycloak — это хвосты прошлых прогонов,
  не наши.
- Пароль `test@test.com` неизвестен и для приёмки не нужен: dev-аккаунты покрывают кейсы.

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
| **Email magic link истекает** | Высокая | Низкий | Письмо `VERIFY_EMAIL` шлётся **админским** вызовом → ориентир **12 ч** (`actionTokenGeneratedByAdminLifespan = 43200`, проверено координатором на живом реалме), а не 5 мин. На экране срок **не обещаем** («ссылка действует ограниченное время»); кнопка resend всегда доступна |
| **MSW моки расходятся с реальным backend** | — | — | ~~Риск снят~~: MSW не заводится (бэкенд готов, 16.10.2026). Контракт-тесты Phase 5 (Playwright против real backend) остаются в силе |

---

## MSW не используется (решение пересмотрено 16.10.2026)

Исходно фронт планировался «на MSW, пока бэкенд не готов». К старту фронт-сессии бэкенд реализован (Phase 0-2, 2.5 и Phase 4
live-проверены), поэтому MSW-слой **не заводится**: ни пакета `msw`, ни `src/shared/lib/msw/` в проекте нет, `VITE_USE_MSW`
не используется.

Вместо этого:

1. фронт работает против живого API (dev — Vite-proxy `/api → http://localhost:3001`);
2. по каждому работающему эндпоинту ставится ✅ в `docs/integration-backend.md` § «Auth endpoints planned»;
3. DTO валидируются Zod-схемами на клиенте — расхождение с бэкендом ловится на входе, а не в рантайме UI.

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

- ~~plan-файл~~ — утрачен (см. предупреждение в начале документа)
- [docs/backend-auth-implementation.md](backend-auth-implementation.md) — spec-level инструкция для backend
- [docs/integration-backend.md](integration-backend.md) — текущий backend контракт + раздел «planned endpoints» обновляется по мере фаз
- ADR'ы Phase 0 — **приняты** (номера отличаются от изначально запланированных: 0009 и 0014 к моменту написания уже были заняты дизайн-язычными решениями):
  - [ADR-0010](adr/0010-form-architecture-vee-validate-zod.md) — Form architecture (VeeValidate + Zod)
  - [ADR-0011](adr/0011-otp-verification-model.md) — OTP-based verification model (phone-only, email через Keycloak magic link)
  - [ADR-0012](adr/0012-error-coding-contract.md) — Error coding contract
  - [ADR-0013](adr/0013-keycloak-hybrid-integration.md) — Keycloak Hybrid Integration (Strategy C)
- Social provider abstraction (Phase 3) и Contact change challenge model (Phase 4) — номера будут выданы при создании, следующий свободный после [ADR-0016](adr/0016-failure-classification-and-bootstrap-outcomes.md).
