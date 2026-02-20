/**
 * 8 (999) 123-45-67 -> +79991234567
 * +7 999 123 45 67 -> +79991234567
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`
  }

  if (digits.length === 10) {
    return `+7${digits}`
  }

  return `+${digits}`
}