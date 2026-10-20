# Звонковый канал проверен живьём (CIBA доходит до host-приложения)

- **Кому:** координатор
- **От кого:** сессия `vue-app-base`
- **Дата:** 20.10.2026
- **Статус:** вопрос (дополнение к `2026-10-19-live-acceptance-phase4.md`)
- **Повод:** в отчёте о приёмке звонковый канал был помечен «не проверено» — теперь проверено.

## Как обошли ограничение контейнера

CIBA-адрес Keycloak (`KC_SPI_CIBA_AUTH_CHANNEL…HTTP_AUTHENTICATION_CHANNEL_URI`) по умолчанию указывает на
`http://app-backend:3001/...`, то есть в контейнер, где dev-провайдер звонка отказывает (`NODE_ENV=production`).
Рецепт без правок фронта:

```powershell
docker compose stop app
$env:APP_PORT='3001'; npm run start:dev                    # host: dev-провайдер работает, порт тот же (proxy фронта не меняем)
$env:CIBA_CHANNEL_URL='http://host.docker.internal:3001/api/v1/internal/ciba/channel'
docker compose up -d --force-recreate keycloak             # Keycloak стучится в host
```

## Результат

```
POST /api/v1/auth/phone/call {phone:'+79991234599', purpose:'sign-up'}
→ 200: challengeId=b0d01833-…, callTo='+7 (800) 000-00-00', expiresAt=+5 мин, otpFallback=true

GET /api/v1/auth/phone/call/<id>: pending ×4 (t=4,8,12,16 с) → verified (t=20 с), verificationToken выдан (43 симв.)
```

В логе host-приложения: `[dev-call] purpose-phone=+7 (***) ***-45-99 callTo=+7 (800) 000-00-00 … (подтвердится через 15с)` —
то есть Keycloak (контейнер) действительно дошёл до host-приложения через `host.docker.internal`, а не до контейнера.

## Побочные эффекты и уборка

- Токен звонка использован **не** был → пользователь по номеру `+79991234599` не создан; OTP-ключи теста удалены из Redis.
- Стенд возвращён в штатный режим: `app-backend` в контейнере (healthy), Keycloak пересоздан **без** `CIBA_CHANNEL_URL`
  (адрес снова `http://app-backend:3001/...`), host-процесс остановлен.

## Что осталось непроверенным

- `503` на `contact-change/verify` (гашение Keycloak в момент подтверждения) — сценарий описан контрактом,
  живьём не гоняли: требует ручного `docker compose stop keycloak` посреди смены контакта.
