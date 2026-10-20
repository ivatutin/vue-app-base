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

  /**
   * Переживание перезагрузки страницы: `changeToken` живёт 15 минут, а без него нельзя ни
   * `verify`, ни `cancel` — и повторный `request` упирается в `422 ContactChangeAlreadyPending`
   * (пользователь «застревал» до истечения TTL). Храним **только в sessionStorage** (на вкладку,
   * умирает с ней): это не credential чужой сессии, а одноразовый токен смены на 15 минут.
   */
  const PERSIST_KEY = 'contact-change:pending'
  const TOKEN_TTL_MS = 15 * 60 * 1000

  function persist (requestedAt: number): void {
    try {
      if (!changeToken.value) {
        return
      }
      sessionStorage.setItem(PERSIST_KEY, JSON.stringify({
        changeToken: changeToken.value,
        requiresOldChallenge: requiresOldChallenge.value,
        channel: channel.value,
        newValue: newValue.value,
        requestedAt,
      }))
    } catch {
      // Приватный режим / запрет storage — смена продолжит работать в памяти.
    }
  }

  function clearPersisted (): void {
    try {
      sessionStorage.removeItem(PERSIST_KEY)
    } catch {
      // см. persist
    }
  }

  function restore (): void {
    try {
      const raw = sessionStorage.getItem(PERSIST_KEY)
      if (!raw) {
        return
      }
      const data = JSON.parse(raw) as {
        changeToken?: unknown
        requiresOldChallenge?: unknown
        channel?: unknown
        newValue?: unknown
        requestedAt?: unknown
      }
      const fresh = typeof data.requestedAt === 'number'
        && Date.now() - data.requestedAt < TOKEN_TTL_MS
      if (!fresh || typeof data.changeToken !== 'string') {
        clearPersisted()
        return
      }
      changeToken.value = data.changeToken
      requiresOldChallenge.value = data.requiresOldChallenge === true
      channel.value = data.channel === 'phone' ? 'phone' : 'email'
      newValue.value = typeof data.newValue === 'string' ? data.newValue : ''
      stage.value = 'codes'
    } catch {
      clearPersisted()
    }
  }

  restore()

  const isPending = computed(() => stage.value === 'codes')
  const isDone = computed(() => stage.value === 'done')

  /** Смена запрошена: запоминаем токен и что именно меняем (для текстов на экране). */
  function startChallenge (challenge: ContactChangeChallenge): void {
    changeToken.value = challenge.changeToken
    requiresOldChallenge.value = challenge.requiresOldChallenge
    channel.value = challenge.channel
    newValue.value = challenge.newValue
    stage.value = 'codes'
    persist(Date.now())
  }

  /** `200` на `verify`: доступ отозван, токен больше не нужен. */
  function complete (): void {
    changeToken.value = null
    requiresOldChallenge.value = false
    stage.value = 'done'
    clearPersisted()
  }

  /** «Отменить» и повторный вход в сценарий с чистого листа. */
  function reset (): void {
    stage.value = 'idle'
    changeToken.value = null
    requiresOldChallenge.value = false
    channel.value = 'email'
    newValue.value = ''
    clearPersisted()
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
