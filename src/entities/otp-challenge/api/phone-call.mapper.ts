import type {
  PhoneCallChallenge,
  PhoneCallResult,
} from '../schema/otp-challenge.schema'
import type { PhoneCallChallengeDto, PhoneCallStatusDto } from './phone-call.dto'

/**
 * DTO → домен для звонкового канала. `method`, `channel` и `otpFallback` не переносим:
 * это признаки ответа, а не состояние, с которым работает UI (канал различается
 * эндпоинтом, а не полем).
 */
export function toPhoneCallChallenge (dto: PhoneCallChallengeDto): PhoneCallChallenge {
  return {
    challengeId: dto.challengeId,
    callTo: dto.callTo,
    expiresAt: dto.expiresAt,
    cooldownSeconds: dto.cooldownSeconds,
  }
}

/** Опрос статуса: отсутствующие поля ответа приводим к `null`, а не к `undefined`. */
export function toPhoneCallResult (dto: PhoneCallStatusDto): PhoneCallResult {
  return {
    challengeId: dto.challengeId,
    status: dto.status,
    verificationToken: dto.verificationToken ?? null,
    reason: dto.reason ?? null,
  }
}
