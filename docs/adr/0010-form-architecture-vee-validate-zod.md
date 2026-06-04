# 0010. Form architecture: VeeValidate + Zod resolver

- **Status:** accepted
- **Date:** 2026-06-03

## Context

Реализация Auth/Registration suite (Phases 0-5 по [auth-roadmap.md](../auth-roadmap.md)) требует серьёзной form-валидации: password strength, email format, phone E.164, OTP 6-digit, confirm-password match, terms checkbox, inline field errors. Текущий `<Form>` ([src/shared/ui/base/form/Form.vue](../../src/shared/ui/base/form/Form.vue)) — тонкая обёртка над `<form @submit.prevent>` без управления валидацией:

```vue
<!-- сейчас -->
<form @submit.prevent>
  <slot />
</form>
```

Без serious form-layer'а каждая страница регистрации повторяла бы один и тот же boilerplate: `ref<string>` на каждое поле + `ref<string | null>` на каждую error + ручной try/catch на submit + manual `aria-invalid`. К 4-й странице регистрации (`/auth/register-email`, `/auth/register-phone`, `/auth/forgot-password`, `/account/security`) это превратится в копипасту.

Альтернативы, которые рассматривали:

1. **Собственный `useForm` composable** на базе Vue reactivity + Zod. Простой, но к 5-му сценарию повторяет ~80% функциональности VeeValidate.
2. **FormKit** — мощный, но крупный (≈40 КБ gzipped core), своя система валидаторов (не Zod), schema-first из коробки. Overkill для нашего scope.
3. **Vorms** — Vue-аналог react-hook-form. Минималистичный, type-safe, но менее зрелый (≈1k stars, slower release cycle).
4. **VeeValidate 4 + `@vee-validate/zod`** — industry standard для Vue 3, активная разработка (≈11k stars, Tailwind/shadcn-сообщество де-факто использует), Zod-resolver `toTypedSchema(zodSchema)` даёт inferred TS-типы из Zod-схемы. ≈6 КБ gzipped core + ≈2 КБ Zod-resolver.

ADR-0003 («Zod как источник истины») фиксирует Zod как primary валидатор. Form-library должна **интегрироваться** с Zod, не дублировать его.

## Decision

**VeeValidate 4 + `@vee-validate/zod`** как primary form-инструмент для всех форм в проекте.

### Интеграция в существующие обёртки

`<Form>` расширяется backward-compatible — старое использование `<Form @submit>` продолжает работать; новое — через `:schema`:

```vue
<!-- старый паттерн (без валидации) -->
<Form @submit="handleSubmit">
  <TextField v-model="email" label="Email" />
  <Button type="submit">Войти</Button>
</Form>

<!-- новый паттерн (через схему) -->
<Form :schema="loginSchema" @submit="handleSubmit">
  <TextField name="email" label="Email" type="email" />
  <PasswordInput name="password" label="Пароль" />
  <Button type="submit">Войти</Button>
</Form>
```

- `:schema` — Zod-схема, `<Form>` под капотом вызывает `useForm({ validationSchema: toTypedSchema(schema) })` и предоставляет field-context через `provide`.
- `<TextField :name>` — подписывается на field-context через `inject`, использует VeeValidate `useField(name)` для error/value sync. Если `name` не задан → fallback на classical `v-model` (backward-compat).
- `@submit` теперь получает уже **валидированный + типизированный** payload.

### Конвенции

1. **Schema живёт в `entities/<slice>/schema/` или `pages/<page>/model/`** — рядом с потребителем. Не плодим global `schemas/` папку.
2. **Имя поля Zod** = `name` в `<TextField>`. Поэтому Zod схема — единственный источник истины для form-structure.
3. **i18n сообщений валидации** — глобально через `configure({ generateMessage })` в `app/providers/setup-form.ts` (или inline в каждой схеме через `.refine(..., { message: 'Обязательное поле' })`). Решение per-case.
4. **Submit-handler** возвращает `Promise<void>`. Ошибки сервера (HttpError) ловятся внутри handler, конвертируются в `setFieldError('email', 'Email уже занят')` через `matchError` ([ADR-0012](0012-error-coding-contract.md)).
5. **Loading-state** — через `isSubmitting` из useForm context, прокидывается в `<Button :loading>` автоматически.

### Что НЕ делаем

- **Не используем FormKit / Vorms / собственный useForm** — VeeValidate + Zod покрывают все use cases, переключение тяжелее чем вход.
- **Не переписываем существующие формы** (LoginPage, LogoutPage) в первой фазе. Только новые формы (Phase 1+). Существующие — мигрируются по триггеру (когда трогаем их по другим причинам).
- **Не валидируем на blur** по умолчанию. VeeValidate `validateOnBlur: false` (default true в v4). Validate on submit + on input после первой ошибки. Это шаблон Linear/Stripe (не paranoid validation).

## Consequences

### Положительные

- **−80% boilerplate** на formh: одна Zod-схема вместо `ref + error + watch + try/catch` на каждое поле.
- **Type-safety**: `<Form @submit="(values: Login) => ...">` — Login тип выведен из Zod-схемы автоматически через `z.infer<typeof loginSchema>`.
- **Single source of truth**: Zod-схема используется и фронтом (валидация), и бэком (если он на Zod-эквиваленте). На бэке — `nestjs-zod`, тот же contract.
- **A11y нативно**: VeeValidate ставит `aria-invalid`, `aria-describedby` на поля автоматически через `useField` integration.
- **Подходит для multi-step wizard'ов** (register-email Phase 1) — `useFormContext()` сохраняет состояние между step'ами.

### Отрицательные

- **+8 КБ gzipped** в bundle (VeeValidate core + Zod-resolver).
- **Mental model**: composable + context + slots. Один раз разобраться — окупится.
- **Magic через provide/inject**: `<TextField name>` работает только внутри `<Form :schema>`. Если разработчик забыл `<Form>` обёртку — поле молча работает как controlled. Митигация: dev-warning в `<TextField>`, если `name` задан, но field-context не inject'нулся.

### Что меняется в коде

- **Phase 0** (этот ADR + следующие):
  - `npm install vee-validate @vee-validate/zod`
  - [src/shared/ui/base/form/Form.vue](../../src/shared/ui/base/form/Form.vue) — расширение пропом `:schema`, provide field-context
  - [src/shared/ui/base/text-field/TextField.vue](../../src/shared/ui/base/text-field/TextField.vue) — `name` prop + inject field-context (backward-compat)
  - Аналогично для `<OtpInput>`, `<PasswordInput>`, `<PhoneInput>` (создаются в Phase 0 вместе)
  - `src/app/providers/setup-form.ts` (опц.) — глобальная i18n VeeValidate сообщений на русский
- **Phase 1+**: новые формы (RegisterEmailPage и т.д.) сразу через `:schema`. LoginPage — мигрируется по триггеру.

## Альтернативы (для истории)

### Собственный useForm на базе Vue + Zod

Не выбран. К 5-му сценарию был бы de-facto VeeValidate. Если уже писать form-layer с парcингом полей, валидацией, error state, dirty/touched tracking — взять готовое.

### FormKit

Не выбран. Хорош для form-heavy продуктов (admin-builder, no-code), но crashes с принципом «Zod как primary». Свой schema-engine, валидаторы. Bundle ≈40 КБ.

### Vorms

Не выбран. Минималистичный, но меньше contributors, медленнее release cycle, меньше StackOverflow purchase. VeeValidate — safer bet для long-term поддержки.

### React-hook-form подход (uncontrolled)

Не применим в Vue 3 (template refs тяжелее, чем `ref(input)` в React). VeeValidate использует controlled-style + reactivity Vue — естественно для экосистемы.

## Связанные ADR / документы

- [ADR-0003](0003-zod-as-source-of-truth.md) — Zod как источник истины (определяет почему форма должна интегрироваться с Zod).
- [ADR-0011](0011-otp-verification-model.md) — OTP verification (использует form-layer для OTP-input).
- [ADR-0012](0012-error-coding-contract.md) — Error coding (определяет как сервер-ошибки попадают в form field errors через `matchError` + `setFieldError`).
- [auth-roadmap.md](../auth-roadmap.md) — phases 0-5 implementation timeline.
