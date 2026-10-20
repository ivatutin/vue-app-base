# Финал Auth v1 на фронте: 3 правки по сданному бэкенду + приёмка

- **Кому:** сессия `vue-app-base` · **От кого:** координатор · **Дата:** 20.10.2026 · **Статус:** handout
- **Сверено с кодом:** `entities/user/api/update-profile.ts:20-36`, `entities/user/model/user.store.ts:63`,
  `pages/account/profile/ui/ProfilePage.vue:12-15,46-49,52,90,97,105,112,114`,
  `shared/api/http-client.ts:177-190`, `shared/api/http-error.ts:1-28`, `vite.config.mts:103-105`

Бэкенд **сдал всё**, что ты ждала: `PATCH /users/me/profile` (коммит `0f8c34f`; Keycloak + shadow; 503 при
недоступном Keycloak; живой критерий «правка → выход/вход → имя на месте» проверен), `Retry-After` на **любом**
503 `contact-change/verify` (5 или 30 с), `ServiceUnavailable` в реестре. Контракт — **v1.6**, больше не меняется.

## 1. Переключить self-service на `/users/me/profile`

- `entities/user/api/update-profile.ts:20-36` — сейчас `/users/${encodeURIComponent(userId)}/profile` (:26).
  Сделай `updateUserProfile(input)` → **`PATCH /users/me/profile`**, параметр `userId` убери (вызов один).
- `entities/user/model/user.store.ts:63` — `updateUserProfile(current.id, input)` → `updateUserProfile(input)`.
- Тесты: `entities/user/api/update-profile.test.ts:27,33,46` — обнови URL в ожидании (:33) и сигнатуру;
  добавь кейс «503 → `ServiceUnavailable` + `retryAfterSeconds`» (см. п. 3).
- Админский `PATCH /users/:id/profile` на бэкенде **остался** — не выпиливай его из DTO/схем, если он где-то нужен.

## 2. Снять read-only с формы профиля

`pages/account/profile/ui/ProfilePage.vue`:
- `canEdit` (:49) — это `hasPermission('user.update')`, т. е. **admin/manager**; больше не нужен: профиль свой,
  эндпоинт доступен любому аутентифицированному. Убери проверку в `submit` (:52), `:disabled="saving || !canEdit"`
  (:90, :97 → `:disabled="saving"`), блоки подсказки `v-if="canEdit"` (:105, :112) и сам комментарий (:12-15, :46-48).
- `canSave` (:43) **оставь** — защита от пустого `PATCH` остаётся правильной.

## 3. Читать `Retry-After`

- `shared/api/http-client.ts:177-190` (`parseResponse`) — там создаётся `HttpError`; добавь чтение
  `response.headers.get('retry-after')` → целые секунды.
- `shared/api/http-error.ts` — новое поле `retryAfterSeconds?: number` (+ конструктор).
- Показ: на `503` из `contact-change/verify` показывать «Повторите через N с» вместо общего текста; если заголовка
  нет — прежний текст. Логика тестируется на `HttpError`, без реальной сети.
- **Проверено:** dev идёт через vite-proxy (`vite.config.mts:103-105`, `/api` → `localhost:3001`) → ответ
  **same-origin**, браузер заголовок не скрывает, `Access-Control-Expose-Headers` не нужен.
  Если увидишь `null` — скажи, это станет задачей бэкенду, а не тебе.

## 4. Приёмка (руками, по шагам)

1. Войти обычным `user` → `/account/profile` → **поля редактируемы** (раньше были read-only).
2. Сменить имя → «Профиль обновлён» → **F5** → значение на месте.
3. **Выйти и войти снова** → имя на месте (это проверяет, что Keycloak источник истины, а не только shadow).
4. `docker compose stop keycloak` → сохранить ещё раз → **503** с понятным текстом (и, если пришло, «через N с»);
   в БД ничего не должно измениться; `docker compose start keycloak` → сохранение снова работает.
5. `contact-change/verify` под 503 (KC остановлен) → в тексте есть «через N с».

## 5. Уборка и DoD

- Закоммить: `.clinerules/` (untracked — правила канала, без них связь пропадёт при клонировании),
  `docs/coordination/questions/*` (там мои статусы `отвечено`), `docs/coordination/replies/*` (мои ответы).
- `npm run type-check && npm run lint && npm test && npm run build` (+ `build-storybook`) — зелёные;
  тестов **не меньше** 322 + новые на п. 1–3.
- Отчёт — файлом в `docs/coordination/questions/` (копия — в `…\njs-server` не нужна): что сделано, вывод приёмки
  по шагам 1–5, число тестов.

## Что дальше (не твоя зона)

После твоего отчёта и ручных шагов владельца (телефон 6–7, два браузера 15) Auth v1 закрывается целиком:
тег `auth-suite-v1.0` на шаблоне → деривация `videano-back`.
