# Known Issues

Реестр известных багов и тех-долга. Дата ревью: **2026-05-22**.

Уровни:
- **P0** — ломает функциональность, фиксить срочно.
- **P1** — мешает работе или вводит в заблуждение, фиксить в первой итерации.
- **P2** — мелочи, фиксить попутно.

Каждый пункт ссылается на конкретное место в коде. План устранения — в [ROADMAP.md](ROADMAP.md).

> **Статус:** Фаза 0 закрыта 2026-05-22 — все P0 и блокирующие P1 устранены, `npm run type-check` green. Текущий реестр содержит только то, что не блокировало старт и осталось на Фазу 1+.

---

## P1 — Существенные

### 1. Хранение токенов в `localStorage`

**Файл:** [src/entities/auth/lib/token-storage.ts](src/entities/auth/lib/token-storage.ts)

**Что:** токены в `localStorage`, имена ключей `__Secure_*` (имя не делает их secure).

**Симптом:** уязвимость к XSS.

**Чинить:** перейти на httpOnly-cookie со стороны backend; зафиксировать решение в ADR. Завязано на появление HTTP-клиента ([ROADMAP](ROADMAP.md), Фаза 1).

### 2. Отсутствие AuthLayout

**Файлы:** [src/pages/auth/login/ui/LoginPage.vue](src/pages/auth/login/ui/LoginPage.vue), [src/pages/auth/logout/ui/LogoutPage.vue](src/pages/auth/logout/ui/LogoutPage.vue)

**Что:** auth-страницы рендерятся внутри `default.vue` вместе с сайдбаром.

**Чинить:** создать `src/app/layouts/auth.vue` + `definePage({ meta: { layout: 'auth' } })`.

---

## P2 — Code quality

| Файл:строка | Проблема |
|-------------|----------|
| [src/pages/index.vue](src/pages/index.vue) | Главная — `HelloWorld` из Vuetify-стартера |
| [vite.config.mts:108](vite.config.mts#L108) | `define: { 'process.env': {} }` — устаревший workaround |
| Имена файлов | Где-то `<Name>Page.vue` (в `ui/`), где-то плоский `<name>.vue` (`buttons.vue`, `typography.vue`) — конвенция зафиксирована в [CONTRIBUTING.md](CONTRIBUTING.md), требует приведения существующих файлов |
| `src/assets/config.json` ↔ `.env` | Два источника конфигурации одних и тех же значений |

---

## Архитектурные пустоты (не баги, но фиксируем)

Не баги, но «отсутствующая инфраструктура» проявится на масштабе. Все вынесены в [ROADMAP.md](ROADMAP.md):

- Нет HTTP-клиента / interceptor'ов / обработки 401.
- Нет валидации env через Zod.
- Нет глобального `app.config.errorHandler`.
- Нет snackbar/notification-стора.
- Нет i18n (UI на русском, тексты вшиты в шаблоны).
- Нет тестов (Vitest, Playwright не настроены).
- Нет ESLint-boundaries для FSD-правил.
- Нет Husky/lint-staged/commitlint.
- Нет CI.

---

## Как пользоваться этим документом

- Берёшь пункт в работу → ставишь себе issue/PR, в нём фиксируешь `KNOWN-ISSUES.md#N`.
- Закрываешь баг → удаляешь пункт из этого файла.
- Если баг порождает архитектурное решение — пиши ADR в [docs/adr/](docs/adr/) до фикса.
