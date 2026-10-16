import type { OtpChallenge, OtpVerification } from '../schema/otp-challenge.schema'
import type { OtpChallengeDto, OtpVerifiedDto } from './otp-challenge.dto'

/**
 * DTO → домен. Преобразование тривиальное, но обязательное: `OtpChallengeDto`
 * не выходит за пределы `api/`-сегмента ([ADR-0005](../../../../docs/adr/0005-dto-domain-mapping.md)).
 */
export function toOtpChallenge (dto: OtpChallengeDto): OtpChallenge {
  return {
    challengeId: dto.challengeId,
    channel: dto.channel,
    target: dto.target,
    expiresAt: dto.expiresAt,
    cooldownSeconds: dto.cooldownSeconds,
    codeLength: dto.codeLength,
  }
}

/**
 * `verified: true` из ответа не переносим: успех выражен уже тем, что запрос
 * не бросил, а дальше нужен только `verificationToken`.
 */
export function toOtpVerification (dto: OtpVerifiedDto): OtpVerification {
  return {
    challengeId: dto.challengeId,
    verificationToken: dto.verificationToken,
  }
}
