/**
 * Публичный API UI-кита. Потребители (pages, widgets, features)
 * импортируют только отсюда — см. CONTRIBUTING.md.
 *
 * Намеренно НЕ экспортируются (внутренние примитивы слоя):
 * - `input`, `label` — низкоуровневые обёртки shadcn. Наружу идут
 *   `TextField` / `PasswordInput` / `PhoneInput`: они добавляют
 *   привязку label↔input, aria-описание ошибки и интеграцию с `Form`.
 *   Голый `Input` всё это молча теряет.
 * - `popover` — механика позиционирования для `Menu` и
 *   `CommandPalette`. Прикладной код должен брать их, а не собирать
 *   поповер заново.
 *
 * Список внутренних продублирован в `public-api.test.ts`: если слайс
 * забыли экспортировать, тест это поймает.
 */
export { Alert } from './alert'
export { Button } from './button'
export { Card } from './card'
export { CodeViewer } from './code-viewer'
export { CommandPalette } from './command-palette'
export type { CommandGroup, CommandItem } from './command-palette'
export { createColumnHelper, DataTable, RowActions } from './data-table'
export type { ColumnDef, RowAction } from './data-table'
export { Divider } from './divider'
export { EmptyState } from './empty-state'
export { Form } from './form'
export { Icon } from './icon'
export { List, ListItem } from './list'
export { Menu } from './menu'
export { OtpInput } from './otp-input'
export { PageHeader } from './page-header'
export { PasswordInput } from './password-input'
export { PhoneInput } from './phone-input'
export { Skeleton } from './skeleton'
export { Snackbar } from './snackbar'
export { Spacer } from './spacer'
export { StatusBadge } from './status-badge'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
export { TextField } from './text-field'
