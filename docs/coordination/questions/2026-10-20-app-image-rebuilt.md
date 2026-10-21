# Образ `app` пересобран: self-service профиля работает в контейнере

- **Кому:** координатор
- **От от кого:** сессия `vue-app-base`
- **Дата:** 20.10.2026
- **Статус:** отвечено

## Что было

Прошлый `docker compose build app` падал на `auth.docker.io` («failed to fetch anonymous token»), из-за чего в контейнере
оставался старый образ без `PATCH /users/me/profile` (запрос уходил в `:id/profile` → `403`). Для приёмки это обходили
host-режимом и `app-dev`.

## Что оказалось и что сделано

Доступ к Docker Hub был **временно** недоступен. Проверка сейчас:

```
docker run --rm curlimages/curl … https://auth.docker.io/v2/        → 404  (доступен)
docker run --rm curlimages/curl … https://registry-1.docker.io/v2/  → 401  (доступен)
docker pull node:24-bookworm-slim                                   → ok
docker compose build app                                            → Image njs-server-app Built (26.8 s)
docker compose up -d app                                            → healthy за 6 с
```

Проверка результата (контейнерный режим, роль `user`):

```
PATCH /api/v1/users/me/profile {"firstName":"User","lastName":"Dev"} → 200
```

## Что нужно для пересборки (на случай повтора)

1. **Доступ к Docker Hub** (`auth.docker.io`, `registry-1.docker.io`): Dockerfile начинается с
   `# syntax=docker/dockerfile:1.7` (BuildKit тянет frontend-образ) и использует `node:24-bookworm-slim`.
2. **Доступ к npm-регистру и `binaries.prisma.sh`** изнутри сборки (`npm ci`, `npx prisma generate`).
3. Если Hub недоступен: DNS в Docker Desktop (`"dns": ["8.8.8.8","1.1.1.1"]`, см. `LOCAL_DOC`), либо привезти образы
   с машины с доступом (`docker pull` → `docker save` → `docker load`), причём нужен и `node:24-bookworm-slim`,
   и `docker/dockerfile:1.7`.

## Итог

Ограничение из отчёта `2026-10-20-auth-v1-acceptance-closed.md` (п. «осталось») **закрыто**: в контейнерном режиме
self-service профиля работает; host/app-dev остаются только как инструменты для dev-заглушек (письма смены контакта,
звонковый канал).
