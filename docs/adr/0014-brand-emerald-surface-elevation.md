# 0014. Brand emerald + surface/elevation модель + токен `--sidebar`

- **Status:** accepted
- **Date:** 2026-06-04
- **Amends:** [ADR-0009](0009-design-language-inter-brand-accent.md) (меняет brand-цвет и уточняет модель поверхностей)

## Context

[ADR-0009](0009-design-language-inter-brand-accent.md) зафиксировал дизайн-язык «нейтральная база + один акцент» и принцип «иерархия через контраст поверхностей, а не рамки». На практике после реализации всплыло три проблемы:

1. **Brand-индиго (`indigo-600/400`) — дефолтный SaaS-акцент.** Узнаваемости нет: ровно тот же индиго у Linear, Stripe и десятков шаблонов. Нужна «своя изюминка».
2. **«Белые бордюры» в dark.** В Tailwind v4 у класса `border` цвет по умолчанию — `currentColor` (в v3 был серый). В проекте не было стандартного shadcn-сброса `* { border-color: var(--border) }`, поэтому все «голые» `border`/`border-t`/… брали цвет **текста** → в dark почти-белые сплошные рамки. Правки токена `--border` к ним вообще не применялись.
3. **Инвертированная элевация в light + хром как «приподнятые панели».** Канва была белой, а `--surface` (карточки) — `zinc-50` (темнее канвы) → карточки «вдавлены», их держал только жёсткий бордюр. Sidebar/header сидели на `--surface` и выглядели как светлые приподнятые панели, а не как рецессивный хром (не по-Linear).

## Decision

1. **Brand → emerald** (cool-зелёный, гармонирует с холодной zinc-базой, отстроен от дефолтного индиго). Light `--brand` = `emerald-700` `rgb(4 120 87)` (именно 700, не 600: AA 5.0:1 и как текст-ссылка, и как заливка; 600 дал бы лишь 3.8:1). Dark `--brand` = `emerald-400` `rgb(52 211 153)` (AAA ~10:1). `--ring` decoupled от brand и чуть ярче для заметности фокуса: light `emerald-600` `rgb(5 150 105)`, dark `emerald-400`.
2. **Глобальный border-reset.** В `@layer base` ([src/shared/assets/tailwind.css](../../src/shared/assets/tailwind.css)) добавлен `*, ::before, ::after { border-color: var(--border) }`. Любая «голая» граница = `--border`; явные утилиты (`border-input`, `border-brand`) переопределяют (utilities-слой).
3. **Hairline-границы.** `--border`/`--input` — не сплошной zinc-шаг, а foreground/white с низкой альфой (граница «чувствуется, а не видится»). Light: border `rgb(9 9 11 / 0.06)`, input `/0.14`. Dark: border `rgb(255 255 255 / 0.14)`, input `/0.18` (input держим сильнее границы — affordance края поля).
4. **Surface/elevation.** Light: канва `--background` = `rgb(250 250 250)` (слегка серая), приподнятые `--surface` (карточки) = `rgb(255 255 255)` (белые) — карточки «всплывают» тенью + hairline, а не «вдавлены». Card-тень снижена `shadow-sm → shadow-xs`. Dark-канва углублена и охлаждена (деликатный cool-tint, B>R): `--background` = `rgb(9 10 13)`, `--surface` = `rgb(22 24 29)`.
5. **Токен `--sidebar`** (зарегистрирован в `@theme` как `--color-sidebar` → утилита `bg-sidebar`). Хром (AppSidebar + AppHeader + AppFooter) переведён с `bg-surface` на `bg-sidebar`. Light `rgb(246 247 249)`, dark `rgb(7 8 11)` — темнее канвы, хром «утопает», контент и карточки в фокусе. Иерархия глубины dark: sidebar(7 8 11) < канва(9 10 13) < карточки(22 24 29).

Источник истины — токены в [src/shared/assets/tokens/](../../src/shared/assets/tokens/). Цель — продуктовый стиль уровня Linear со своей изюминкой (зелёный вместо индиго).

## Consequences

- **+** Узнаваемый бренд-сигнал (emerald), уход от дефолтного индиго.
- **+** Починен корневой баг «белых бордюров»; границы теперь реально управляются токеном `--border`.
- **+** Корректная элевация: разделение «канва / контент / поверхность / хром» тоном, а не рамками — ровно принцип ADR-0009, теперь выполненный.
- **−** Альфа зашита в значение токена `--border`/`--input` — нельзя применять alpha-modifier (`border-border/50`) поверх; на практике border-утилиты их не используют.
- **−** `--success` (green-500) теперь по hue ближе к brand-emerald. Рядом почти не встречаются (бренд — nav/links, success — toast/badge); при необходимости развести success в более тёплый/яркий зелёный.
- **−** Возможен `--sidebar-foreground`, если текст на хроме потребует отдельного тона (пока переиспользуется `--surface-foreground`/`--muted-foreground`).

Не отменяет [ADR-0009](0009-design-language-inter-brand-accent.md) и [ADR-0007](0007-ui-stack-migration-from-vuetify.md), а уточняет визуальный язык поверх них.
