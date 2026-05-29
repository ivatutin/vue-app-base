import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Слить Tailwind-классы с разрешением конфликтов (последний выигрывает).
 *
 * Стандартный хелпер shadcn-vue: позволяет писать
 * `<Button class="..." />` и переопределять дефолты внутри обёртки.
 */
export function cn (...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
