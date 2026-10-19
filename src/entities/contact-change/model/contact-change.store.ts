import type { ContactChangeChallenge, ContactChannel } from '../api'

/**
 * Состояние активной смены контакта — **страница не хранит токен сама**.
 *
 * `changeToken` живёт 15 минут и нужен обоим шагам (`verify`, `cancel`), поэтому
 * лежит в сторе: перерисовка карточки не должна терять смену. Это не credential
 * чужой сессии — токен привязан к `(userId, channel, newValue, oldValueAtRequest)`
 * и после `verify`/`cancel` бесполезен, поэтому в `localStorage` не пишется.
 *
 * Стадии намеренно три:
 * - `idle` — формы «новое значение + пароль»;
 * - `codes` — смена запрошена, вводим `newCode` (и `oldCode`, если требуется);
 * - `done` — контакт изменён, доступ отозван: сессия уже сброшена, остаётся уйти на вход.
 *
 * `oldCode`/`newCode` в сторе **не** живут: это значения полей ввода (ADR-0011 § Anti-patterns).
 */
export type ContactChangeStage = 'idle' | 'codes' | 'done'

export const useContactChangeStore = defineStore('contact-change', () => {
  const stage = ref<ContactChangeStage>('idle')
  const changeToken = ref<string | null>(null)
  const requiresOldChallenge = ref(false)
  const channel = ref<ContactChannel>('email')
  const newValue = ref('')

  const isPending = computed(() => stage.value === 'codes')
  const isDone = computed(() => stage.value === 'done')

  /** Смена запрошена: запоминаем токен и что именно меняем (для текстов на экране). */
  function startChallenge (challenge: ContactChangeChallenge): void {
    changeToken.value = challenge.changeToken
    requiresOldChallenge.value = challenge.requiresOldChallenge
    channel.value = challenge.channel
    newValue.value = challenge.newValue
    stage.value = 'codes'
  }

  /** `200` на `verify`: доступ отозван, токен больше не нужен. */
  function complete (): void {
    changeToken.value = null
    requiresOldChallenge.value = false
    stage.value = 'done'
  }

  /** «Отменить» и повторный вход в сценарий с чистого листа. */
  function reset (): void {
    stage.value = 'idle'
    changeToken.value = null
    requiresOldChallenge.value = false
    channel.value = 'email'
    newValue.value = ''
  }

  return {
    /** state */
    stage,
    changeToken,
    requiresOldChallenge,
    channel,
    newValue,

    /** getters */
    isPending,
    isDone,

    /** actions */
    startChallenge,
    complete,
    reset,
  }
})
