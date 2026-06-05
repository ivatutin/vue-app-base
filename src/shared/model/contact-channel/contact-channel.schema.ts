import { z } from 'zod'

/**
 * Канал связи для верификации / change-contact / OTP. См. ADR-0011.
 *
 * - `email` — Keycloak magic link (sendVerifyEmail), не OTP-сервис
 * - `phone` — наш 6-digit OTP через SMS / Telegram
 */
export const contactChannelSchema = z.enum(['email', 'phone'])

export type ContactChannel = z.infer<typeof contactChannelSchema>
