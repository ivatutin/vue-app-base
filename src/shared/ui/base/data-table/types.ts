/** Действие в «⋯»-меню строки (RowActions). */
export interface RowAction {
  label: string
  icon?: string
  /** Красный стиль (деструктивное действие, напр. «Удалить»). */
  danger?: boolean
  disabled?: boolean
  /** Отрисовать разделитель перед пунктом (например, перед danger-группой). */
  dividerBefore?: boolean
  onClick: () => void
}
