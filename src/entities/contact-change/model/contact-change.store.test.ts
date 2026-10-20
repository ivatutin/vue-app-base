import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useContactChangeStore } from './contact-change.store'

const CHALLENGE = {
  changeToken: 'ct-1',
  requiresOldChallenge: true,
  oldChallengeId: 'old-1',
  newChallengeId: 'new-1',
  channel: 'email' as const,
  newValue: 'new@example.test',
}

describe('contact-change store: переживание перезагрузки', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('после startChallenge новый экземпляр стора восстанавливает стадию и токен', () => {
    useContactChangeStore().startChallenge(CHALLENGE)

    // Имитация F5: новая pinia + новый инстанс стора.
    setActivePinia(createPinia())
    const restored = useContactChangeStore()

    expect(restored.stage).toBe('codes')
    expect(restored.changeToken).toBe('ct-1')
    expect(restored.requiresOldChallenge).toBe(true)
    expect(restored.newValue).toBe('new@example.test')
  })

  it('reset и complete очищают сохранённую смену', () => {
    const store = useContactChangeStore()

    store.startChallenge(CHALLENGE)
    store.reset()
    expect(sessionStorage.getItem('contact-change:pending')).toBeNull()

    store.startChallenge(CHALLENGE)
    store.complete()
    expect(sessionStorage.getItem('contact-change:pending')).toBeNull()
  })

  it('устаревшая запись (старше 15 минут) не восстанавливается', () => {
    sessionStorage.setItem('contact-change:pending', JSON.stringify({
      ...CHALLENGE,
      requestedAt: Date.now() - 16 * 60 * 1000,
    }))

    const store = useContactChangeStore()

    expect(store.stage).toBe('idle')
    expect(sessionStorage.getItem('contact-change:pending')).toBeNull()
  })
})
