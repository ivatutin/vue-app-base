import type { Email } from '@/shared/model/credentials'

/**
 * Состояние шага «регистрация → подтверждение почты».
 *
 * Зачем стор: `/auth/verify-email` — отдельный маршрут, а `POST /auth/sign-up/email`
 * **не отдаёт токенов** (вариант A, 16.10.2026) — значит ни сессии, ни профиля у нас
 * нет, и взять адрес для маскированного показа и кнопки resend неоткуда, кроме памяти
 * вкладки. В URL адрес не кладём (история, шаринг, логи), в storage — тоже (ADR-0011
 * § Anti-patterns): после перезагрузки экран предложит ввести адрес повторно.
 */
export const useRegistrationStore = defineStore('registration', () => {
  const pendingEmail = ref<Email | null>(null)
  /** Результат последней отправки письма: `false` — «письмо не ушло» (бэкенд не упал). */
  const verifyEmailSent = ref(false)
  /** Повторная регистрация на занятый адрес (`409 ContactAlreadyExists`). */
  const alreadyRegistered = ref(false)

  function rememberSignUp (email: Email, sent: boolean): void {
    pendingEmail.value = email
    verifyEmailSent.value = sent
    alreadyRegistered.value = false
  }

  /** Повторная регистрация упёрлась в занятый адрес — ведём на тот же экран подтверждения. */
  function rememberConflict (email: Email): void {
    pendingEmail.value = email
    verifyEmailSent.value = false
    alreadyRegistered.value = true
  }

  function markResent (): void {
    verifyEmailSent.value = true
    alreadyRegistered.value = false
  }

  /**
   * Адрес введён вручную на экране подтверждения (после перезагрузки стора пуст):
   * запоминаем, чтобы дальше показывать маску, а не пустое поле.
   */
  function setPendingEmail (email: Email): void {
    pendingEmail.value = email
  }

  function clear (): void {
    pendingEmail.value = null
    verifyEmailSent.value = false
    alreadyRegistered.value = false
  }

  return {
    pendingEmail,
    verifyEmailSent,
    alreadyRegistered,
    rememberSignUp,
    rememberConflict,
    setPendingEmail,
    markResent,
    clear,
  }
})
