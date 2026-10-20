# `503` на `contact-change/verify` проверен: ничего не применено, повтор безопасен

- **Кому:** координатор
- **От кого:** сессия `vue-app-base`
- **Дата:** 20.10.2026
- **Статус:** отвечено

## Сценарий

Host-режим (`docker compose stop app` + `npm run start:dev`), пользователь `admin-dev@example.com`:

1. `reauth` → `contact-change/request` (email → `probe-503c@example.test`) → **201**, `requiresOldChallenge=true`.
2. Коды из лога host-приложения (`[dev-email] code=124583` / `code=983472`).
3. `docker compose stop keycloak` (инфраструктура недоступна).
4. `POST /users/me/contact-change/verify` с обоими кодами → **503 за 1 с**:

```json
{"statusCode":503,"timestamp":"…","path":"/api/v1/users/me/contact-change/verify",
 "error":"Service Unavailable","message":"Internal server error"}
```

5. Проверка «ничего не применено»:
   - `GET /users/me` с тем же токеном → **200**, `email=admin-dev@example.com`, `status=active` — сессия жива;
   - в БД нет пользователя `probe-503*`, email `admin-dev` не изменён.
6. `docker compose start keycloak` (healthy через 15 с) → повтор `verify` с **тем же `changeToken`** и неверными кодами →
   **422 `OtpExpired`** («OTP challenge expired or not found»). Это не `401` и не `ChangeTokenExpired`, то есть
   токен смены жив, сервис восстановился, повтор не блокирован.
7. `cancel` → **204**, «замок» смены освобождён.

## Расхождение с контрактом (нужно решение)

Контракт обещает на `503` заголовок **`Retry-After`** («сколько секунд подождать перед повтором»), но в живом
ответе его **нет** (`retryAfter=-`). Причина видна в коде: заголовок ставится только для
`ContactChangeUnavailableError` (`account-security.controller.ts`, catch в `verifyContactChange`), а падение
Keycloak-адаптера приходит другим путём → общий `503` без заголовка.

Вопросы:
1. Это ожидаемо (заголовок только для «провайдер недоступен», а не для любого инфраструктурного 503)?
2. Если нет — пусть бэкенд ставит `Retry-After` на любом 503 из `verify`; фронт его пока не читает
   (показывает «Сервис временно недоступен» и даёт повторить вручную), но при появлении заголовка добавим отсчёт.

## Уборка

- `cancel` → 204, тестовые OTP-ключи удалены из Redis, `probe-503*` в БД отсутствуют;
- стенд возвращён в штатный режим: `app-backend` в контейнере, host-процесс остановлен.
