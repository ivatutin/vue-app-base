# Финал Auth v1 на фронте: 3 правки сделаны, приёмка пройдена (с двумя замечаниями к бэкенду/стенду)

- **Кому:** координатор
- **От кого:** сессия `vue-app-base`
- **Дата:** 20.10.2026
- **Статус:** отвечено
- **Отвечает на:** `replies/finish-auth-v1.md`, `replies/2026-10-20-contract-v1.6-applied.md`

## Сделано (3 правки)

1. **`updateUserProfile` → `PATCH /users/me/profile`** (без `:id`): `entities/user/api/update-profile.ts`,
   вызов в `user.store.ts` → `updateUserProfile(input)`; ответ по-прежнему полный `UserDto` через тот же mapper.
2. **Read-only снят**: `ProfilePage` больше не проверяет `user.update` — поля редактируются всеми, `canSave`
   (защита от пустого `PATCH`) оставлен. Админский `PATCH /users/:id/profile` на бэкенде не трогали.
3. **`Retry-After` читается**: `HttpError.retryAfterSeconds` (7-й параметр конструктора), парсинг в
   `HttpClient.parseResponse` (секунды и HTTP-дата), текст в `getErrorMessage`: «Сервис временно недоступен —
   повторите через N с» для любого 5xx с заголовком. Отдельной логики в карточке контакта не потребовалось.

Тесты: **326 (45 файлов)**, из них +4 новых (Retry-After из 503 в `HttpError`, отсутствие заголовка, текст «через 30 с»,
проброс 503 из `updateUserProfile` с `retryAfterSeconds`) — плюс обновлены тесты профиля под новый путь.

## Приёмка (живая, host-режим на 3001)

| Шаг | Результат |
|---|---|
| `user` (не админ): `PATCH /users/me/profile` | **200**, `firstName/lastName` применились |
| Выход/вход → `GET /users/me` | имя на месте (значит, запись в Keycloak, а не только shadow) ✔ |
| Keycloak остановлен → PATCH профиля | **503**, shadow **не изменён**; `Retry-After` на этом пути **не отдаётся** (см. ниже) |
| Keycloak остановлен → `contact-change/verify` | **503 + `Retry-After: 3`** → UI покажет «повторите через 3 с» ✔ |
| Возврат Keycloak → PATCH | снова 200, `cancel` смены → 204 |

## Замечания (нужны бэкенду/координатору)

1. **Первый PATCH профиля дал 400 от Keycloak → 503.** До этого `user-dev` имел пустые `firstName/lastName`.
   Лог бэкенда: `profile update: keycloak write failed …: Request failed with status code 400`, затем
   `IdentityProfileUnavailableError → 503`. Прямой повтор того же представления через Admin API — 204, и после
   этого API-путь заработал (200), включая кириллицу. Похоже на валидацию декларативного профиля на «пустых»
   значениях; **просьба**: логировать тело 400 от Keycloak (`axios` его отдаёт), иначе такие кейсы не разобрать.
2. **`Retry-After` на 503 профиля отсутствует** (на `contact-change/verify` — есть, 3 с). Если задумано «на любом 503» —
   это не так; если только на `verify` — ок, фронт корректно покажет generic-текст.
3. **Образ контейнера `app` устарел**: в нём нет `PATCH /users/me/profile` (запрос попадал в `:id/profile` → 403).
   Пересобрать не смог: `docker compose build app` падает на `auth.docker.io` (нет сети/токена — то же окружение,
   что и `binaries.prisma.sh`). **Стенд оставлен в host-режиме** (`npm run start:dev` на 3001, контейнер `app` остановлен),
   чтобы владелец мог пройти UI-приёмку. Когда registry доступен — `docker compose build app && docker compose up -d app`.

## Уборка и коммиты

- OTP-ключи очищены, пробная смена контакта отменена (`cancel` 204), новых пользователей не создано;
  `user-dev` получил имя `User Dev` (было пусто — реалм требует имя у роли `user`).
- `.clinerules/coordination.md` закоммичен (правила канала), файлы `docs/coordination/{questions,replies}` — тоже.
- Финальный прогон: `type-check` ✅ · `lint` ✅ · **326 тестов** ✅ · `build` ✅ · `build-storybook` ✅.

## Вопрос

Доска DoD: строку «код + автоматика» можно оставить ✅; «ручная приёмка владельцем» — ⏳ (телефон 6–7, два браузера 15).
Нужно ли что-то от меня по п. 1–2 (это бэкенд-зона), или фиксируем как задачи бэкенду?
