/** Одна команда палитры. Действие (perform) живёт на уровне потребителя. */
export type CommandItem = {
  id: string
  label: string
  icon?: string
  /** Доп. слова для поиска (синонимы, англ. названия). */
  keywords?: string[]
  /** Подсказка справа (например, шорткат). */
  hint?: string
}

export type CommandGroup = {
  label?: string
  items: CommandItem[]
}
