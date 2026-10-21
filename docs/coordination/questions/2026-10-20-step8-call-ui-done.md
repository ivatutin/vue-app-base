# Шаг 8 (обратный звонок в UI) пройден; рецепт стенда для CIBA зафиксирован

- **Кому:** координатор
- **От кого:** сессия `vue-app-base`
- **Дата:** 20.10.2026
- **Статус:** отвечено
- **Источник:** ручная приёмка владельцем, шаг 8 чек-листа `handover/manual-acceptance-auth-v1.md`

## Что проверено (UI, живой стенд)

Владелец: `/auth/login` → «Телефон» → `+7 999 000-00-07` → канал **«Обратный звонок»** → «Позвонить».
Ожидаемо и получено: `callTo = +7 (800) 000-00-00`, таймер 5 минут, **без ввода кода** статус сменился на
`verified` через ~15 с, вход прошёл. Подтверждено и на API: `pending ×2 → verified` за 12 с, `verificationToken` выдан.

## Почему host-вариант не сработал и что сделано вместо

Прошлый рецепт («host на 3001 + `CIBA_CHANNEL_URL=http://host.docker.internal:3001/...`») **не работает в этом окружении**:
проверка из контейнера Keycloak показала `PORT3001_FAIL` — `host.docker.internal` до node на хосте не доходит
(Windows Firewall / Docker-сеть). Keycloak отвечал `server_error: Failed to send authentication request`.

Рабочая схема — второй инстанс в **той же сети compose**:

```powershell
# образ тот же, но NODE_ENV=development → dev-провайдер звонка жив
docker run -d --name app-dev --network njs-server_app-network -p 3101:3001 `
  --env-file C:\WORK\v1m\njs-server\.env `
  -e NODE_ENV=development -e APP_PORT=3001 `
  -e DATABASE_URL='postgresql://postgres:postgres@postgres:5432/app?schema=public' `
  -e REDIS_HOST=redis -e REDIS_PORT=6379 `
  -e KEYCLOAK_URL=http://keycloak:8080 -e KEYCLOAK_ISSUER='http://localhost:8088/realms/app' `
  njs-server-app:latest

$env:CIBA_CHANNEL_URL='http://app-dev:3001/api/v1/internal/ciba/channel'
docker compose up -d --force-recreate keycloak

# фронт: весь /api → app-dev
$env:VITE_PROXY_TARGET='http://localhost:3101'; npm run dev
```

Плюс во фронте появилась поддержка `VITE_PROXY_TARGET` (`vite.config.mts`, дефолт `http://localhost:3001`) — коммит ниже.

**Почему именно так:** CIBA-канал должен быть доступен **из контейнера Keycloak**, а dev-провайдер звонка работает только
при `NODE_ENV=development`. `app-dev` в сети compose закрывает оба требования; состояние челленджей общее через Redis.

Уборка после прогона: `docker rm -f app-dev`, Keycloak пересоздан без `CIBA_CHANNEL_URL` (адрес снова `app-backend:3001`),
фронт перезапущен без `VITE_PROXY_TARGET`.

## Статус чек-листа владельца

| Шаги | Статус |
|---|---|
| 1–4 (регистрация email → письмо → подтверждение → вход) | ✅ |
| 6–8 (телефон: регистрация, вход, обратный звонок) | ✅ |
| 9 (профиль, new self-service `PATCH /users/me/profile`) | ✅ |
| 10 (смена пароля с reauth) | ✅ |
| 12–14 (смена контакта: double OTP, 409, cancel→повтор) | ✅ |
| 15 (два браузера, `logout-all`) | ✅ |
| 16–17 (RBAC: `/roles` под `user` → forbidden, под `admin` → доступ) | ✅ |
| **5** (сброс пароля по ссылке Keycloak до конца) | ⬜ не кликали ссылку, чтобы не менять пароль фикстуры |
| **11** (установка пароля passwordless-аккаунту) | ⬜ не прогоняли |
| **18** (уборка тестовых аккаунтов) | ⬜ ждёт решения: `check-1020@example.test`, `+79990000005`, `+79990000006` |

## Вопросы

1. **Шаги 5 и 11** — прогонять (шаг 5 сменит пароль `user-dev`/вашего аккаунта; шаг 11 — задать пароль телефонному)?
2. **Уборка (18)** — удалять `check-1020@example.test`, `+79990000005`, `+79990000006`? По вашей формулировке «фикстур
   достаточно (`admin-dev`, `user-dev`)» — да, удаляю по команде.
3. Образ контейнера `app` по-прежнему **старый** (нет `/users/me/profile`): `docker compose build app` блокируется
   недоступностью `auth.docker.io`. До пересборки self-service профиля в контейнерном режиме даёт `403` (в `app-dev`
   тоже, образ тот же).
