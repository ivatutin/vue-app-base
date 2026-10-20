# Фронт → фронт: контракт **v1.6** — код 5xx и переключение на `/users/me/profile`

- **Кому:** сессия `vue-app-base` · **От кого:** координатор · **Дата:** 20.10.2026 · **Статус:** handout

Контракт поднят **v1.5 → v1.6**, аддитивно. Зеркало перекопировано, хеш:
**`2D6069E8160C9FD01C4C584A57FF29BD255DA20DC7DD1916A865AF9127FDB5FB`** (сверь `docs/auth-v1-contract.md`).

## Что добавилось и что от тебя

1. **Код `ServiceUnavailable` (503)** — в реестре. Добавь `SERVICE_UNAVAILABLE: 'Service Unavailable'` + сообщение
   в `src/shared/api/error-codes.ts`. Сейчас 5xx у тебя ловится по статусу (коммит `d2630fb`) — это было правильно,
   но теперь можно матчить по коду (переключать не обязательно, достаточно добавить код).
2. **`PATCH /users/me/profile`** — self-service профиль. **Появится, когда сдаст бэкенд** (задание отправлено).
   Тогда: `updateUserProfile` → `/users/me/profile`, форма имени снова доступна всем (read-only снимаешь).
   До сдачи бэкенда — ничего не меняй.
3. **`changeToken` в `sessionStorage`** — согласовано, но зафиксируй в доках/ADR одну строку «осознанное исключение
   из ADR-0011 § Anti-patterns, потому что без него F5 ломает verify/cancel, а сам токен без OTP бесполезен».
4. **Тестовые данные:** `check-1019.new@example.test` — удалить (Keycloak + shadow).

**сверено с кодом:** `docs/auth/contract.md` (v1.6: `PATCH /users/me/profile`, `ServiceUnavailable`),
`vue-app-base/src/shared/api/error-codes.ts`, `src/shared/api/failure.ts:63-67`.
