# 0011. OTP-based verification model

- **Status:** accepted
- **Date:** 2026-06-03
- **Revision:** 2 (2026-10-16) — уточнён FSM `entities/otp-challenge` (реализован в Phase 0), введён внутренний `OtpDelivery = 'otp' | 'call'`, зафиксированы отказ от polling на `/auth/verify-email` (вариант A) и отказ от счётчика попыток в UI; по ревью координатора уточнён выход из `rateLimited` и гейт кнопки (`canRetrySend`). См. § Decision и § FSM.

## Context

Auth/Registration suite требует **верификации владения каналом связи** в нескольких сценариях (phone signup, phone login, contact change, set password для passwordless-user'ов). Email верификация — отдельный канал с другими свойствами (есть native magic link, есть Keycloak built-in).

Два архитектурных решения, которые надо зафиксировать:

1. **Какая модель верификации** для phone-канала: 6-digit OTP, magic link через SMS, или что-то ещё?
2. **Email-верификация** — унифицировать с phone (custom OTP) или делегировать Keycloak (`sendVerifyEmail` magic link)?

### Альтернативы для phone

- **6-digit OTP** (SMS / Telegram / WhatsApp) — пользователь вводит код на сайте. Кросс-устройство (открыл сайт на десктопе, SMS на телефоне).
- **Magic link через SMS** — клик на ссылку в SMS. Ломает кросс-устройство (link открывается там, где доступен браузер), ссылки в SMS воспринимаются как spam/phishing.
- **Push-уведомление в native app** — нет mobile app у нас.
- **Carrier verification API** (SilentAuth) — требует мобильного direct connection + dependence на оператора (US/EU only).

### Альтернативы для email

- **Custom OTP** (6-digit, как у phone) — унификация UI/инфры. Требует свой SMTP в backend.
- **Keycloak `sendVerifyEmail`** (magic link) — production-ready, Keycloak realm SMTP, i18n templates, ничего своего не пишем.

## Decision

### Phone — 6-digit OTP

- 6 цифр, TTL 5 минут, hash в Redis через argon2id
- Кросс-устройство (вводится на исходном устройстве)
- Каналы: SMS (primary), Telegram Bot (Phase 3), WhatsApp (опц.)
- Auto-fill через WebOTP API (Android Chrome), `<input autocomplete="one-time-code">` для iOS
- Rate limit per-target (3/час) + per-IP (10/час) + cooldown 60s

### Email — Keycloak `sendVerifyEmail` (magic link, не custom OTP)

После критического ревью плана: делегируем Keycloak максимум того, что он делает нативно ([ADR-0013](0013-keycloak-hybrid-integration.md)).

- `keycloakAdmin.users.sendVerifyEmail(id)` отправляет magic link через realm SMTP
- Пользователь кликает → Keycloak обрабатывает verify → fires `VERIFY_EMAIL` event
- Backend ловит event → обновляет Postgres shadow user
- Frontend: `/auth/verify-email` — **статичный** экран «проверьте почту» (решение координатора, 16.10.2026). Polling невозможен: `POST /auth/sign-up/email` токенов не отдаёт (`{ user, verifyEmailSent }`), а `GET /users/me` protected; ссылка `VERIFY_EMAIL` уводит на страницу Keycloak и в приложение не возвращает. Подтверждение — попыткой входа после клика по ссылке

**Почему не унифицируем с phone OTP:**
- Keycloak делает email verification «бесплатно» (SMTP в realm settings, i18n templates, rate limiting, anti-abuse). Дублировать = переписывать Keycloak.
- Magic link даёт **better UX для email** (один клик), хоть и теряется кросс-устройство (но email — обычно на том же устройстве, что и браузер; редкий случай).
- Для **change email** в Phase 4 — другой паттерн: там OTP на NEW email (поскольку user должен подтвердить владение новым адресом до применения). Backend применит change → потом отправит Keycloak verifyEmail.

### Unified `OtpChallenge` контракт (для phone, future Telegram, change-contact OTP)

```typescript
// backend: OTP_PURPOSES (otp-policy.ts:18-25) — фронт повторяет дословно
type OtpPurpose =
  | 'sign-up'          // регистрация
  | 'sign-in'          // вход по phone
  | 'verify-contact'   // post-signup pending verification
  | 'change-contact-old'  // подтверждение владения OLD контактом при смене
  | 'change-contact-new'  // подтверждение владения NEW контактом при смене
  | 'set-password'     // установить password для passwordless user

// фронт: внутренний словарь способа подтверждения — на провод не выводится
// (канал различается эндпоинтом: /auth/otp/* против /auth/phone/call)
type OtpDelivery = 'otp' | 'call'
```

Реализация моделей — [`shared/model/otp/`](../../src/shared/model/otp/): `otpPurposeSchema` + `otpDeliverySchema`.
Канал контакта (`ContactChannel = 'email' | 'phone'`, [`shared/model/contact-channel/`](../../src/shared/model/contact-channel/))
не смешивается со способом подтверждения. `forgot-password` в OTP-сервисе **не используется** — сброс пароля идёт через
Keycloak Required Action (`UPDATE_PASSWORD`).

### FSM в `entities/otp-challenge` (реализовано 2026-10-16)

```
idle → sending → sent → verifying → verified
                   ↑                  ↘ invalid | expired | locked | rateLimited | alreadyExists | failed
                   └── resend() ──────┘
```

Путь отправки один: `resend()` вызывает тот же `send()`, поэтому отдельного статуса `resending` нет — UI различает
первую отправку и повтор по наличию активного челленджа и по таймеру `cooldownLeft`.

Терминальные состояния заведены по тому, как их показывает UI: `invalid` — остаться на экране ввода (поле очистить);
`expired` — «начать заново»; `locked` (5 неверных попыток) — предложить resend; `rateLimited` — таймер из
`details.retryAfter`; `alreadyExists` (`409 ContactAlreadyExists`, только `sign-up`) — переход на экран «проверьте
почту»; `failed` — всё остальное, включая сеть и 5xx.

**Счётчика оставшихся попыток нет:** контракт его не отдаёт (ни в ответе `verify`, ни в `details` ошибок — только
коды), поэтому UI не показывает выдуманное число и реагирует только на `locked`.

**Выход из `rateLimited` и `locked`:** повторный `send(target, purpose)` из флоу — после истечения cooldown. Первая
отправка тоже может упереться в лимит (3/час на target), а тогда челленджа ещё нет и `resend()` (без параметров) вызвать
нечем. Поэтому гейт кнопки — `canRetrySend` (`!isBusy && cooldownLeft === 0`), а `canResend` остаётся безопасным условием
именно для `resend()` (требует сохранённую отправку). Состояние при закрытии сообщения об ошибке **не сбрасывается в
`idle`**: статус несёт причину блокировки, кнопку гейтит cooldown.

Pinia setup-store держит **одну активную challenge единовременно**. Состояние эфемерное — не persist'ится (на refresh теряется, и это правильно — challenge на бэке тоже короткоживуща). `verificationToken` стор **не хранит**: `verify()` возвращает его вызывающему коду, а тот предъявляет токен в `sign-up/phone` / `sign-in/phone` / `set-password`.

### Anti-patterns

- **Не сохранять challengeId в URL/localStorage** — только ephemeral Pinia. Иначе при clipboard share/screenshot утекает.
- **Не показывать OTP в UI после ввода** — после `verify` clear input. Не логировать OTP в console / Sentry.
- **Кнопка resend disabled по cooldown** — backend выдаёт `cooldownSeconds`, frontend FSM-store запоминает `cooldownUntil`, UI показывает таймер.
- **Не auto-submit при вводе 6-й цифры** — даём пользователю проверить. Submit — explicit button или Enter (доступно).
- **Не unlimited attempts** — backend lock'ает challenge после 5 неверных попыток (422 `OtpTooManyAttempts`), пользователь делает resend.

## Consequences

### Положительные

- **Унификация phone-flow**: один `OtpInput`, один `useOtpChallengeStore`, один backend контракт `/auth/otp/send|verify` для всех phone-сценариев.
- **Минимум кода для email**: Keycloak делает 95% работы (template, send, verify, audit, i18n). Frontend — только страница «Проверьте почту» + polling.
- **NIST SP 800-63B compliance**: hash OTP (argon2id), TTL ≤5 min, max-attempts lock, rate limit — стандарты соблюдены.

### Отрицательные

- **Двойственность для пользователя**: для phone — вводи код, для email — кликни ссылку. Митигация: UX-копи на странице verify объясняет («Мы отправили ссылку на ваш email — кликните, чтобы подтвердить» vs «Введите код из SMS»).
- **Не полностью кросс-устройство для email**: если пользователь регистрируется на десктопе, а email открывает на телефоне — кликает на телефоне, а на десктопе нужно обновить страницу и войти (polling-а нет, см. § Decision).
- **Зависимость от Keycloak SMTP** для email verify. Митигация: production использует SES/SendGrid через Keycloak realm; в dev — Mailpit.

### Что меняется в коде

- **Phase 0 — сделано (2026-10-16)**:
  - `shared/model/otp/` — `otpPurposeSchema` (6 значений, сверено с бэкендом) + `otpDeliverySchema`
  - `entities/otp-challenge/` — `api` (`POST /auth/otp/send`, `POST /auth/otp/verify` + DTO и mapper по [ADR-0005](0005-dto-domain-mapping.md)), `schema`, `model/otp-challenge.store.ts` (FSM выше); тесты — 13 (store) + 6 (api)
  - `shared/ui/base/otp-input/OtpInput.vue` — 6-segment input (готов с M0.B)
- **Phase 1**: страница `/auth/verify-email` — статичный экран «проверьте почту» + resend + «войти» (без polling, см. § Decision)
- **Phase 2**: использование `useOtpChallengeStore` в `registerPhoneFlow` + `loginPhoneFlow`
- **Phase 4**: использование в `changeContactFlow` (change-contact-old + change-contact-new purposes)

## Альтернативы (для истории)

### Custom OTP для email (унификация с phone)

Не выбран. Это означало бы:
- Backend сам управляет SMTP (NestJS + Nodemailer / SES SDK / sendgrid SDK).
- Свои email-templates (HTML + plain text, поддержка i18n).
- Свой rate limiting, audit, anti-abuse.

Дублирование Keycloak. Окупается только если хотим polled bug-free single-page UX, но цена — несоразмерная.

### Magic link через SMS

Не выбран. UX-проблемы:
- Ссылки в SMS воспринимаются как spam/phishing (multiple anti-fraud filters).
- Ломает кросс-устройство (link открывается там, где доступен браузер, не обязательно совпадает с устройством, где SMS).
- Карриеры в РФ часто блокируют HTTP-ссылки в SMS.

### Push в native app

Нет mobile app. Web push в браузере — не покрывает основной use case (регистрация — момент когда web-push permissions ещё не выданы).

### Carrier verification API (SilentAuth)

Ограниченное operator support, в РФ нет крупного aggregator'а, требует mobile direct connection (не Wi-Fi). Future-возможность, не основной flow.

## Связанные ADR / документы

- [ADR-0010](0010-form-architecture-vee-validate-zod.md) — Form architecture (используется в OtpInput).
- [ADR-0012](0012-error-coding-contract.md) — Error coding (`OtpInvalid`, `OtpExpired`, `OtpTooManyAttempts`, `OtpRateLimited`).
- [ADR-0013](0013-keycloak-hybrid-integration.md) — Keycloak hybrid (объясняет почему email верифицируется через Keycloak).
- [auth-roadmap.md](../auth-roadmap.md) + [backend-auth-implementation.md](../backend-auth-implementation.md) — phases timeline + backend specs.
