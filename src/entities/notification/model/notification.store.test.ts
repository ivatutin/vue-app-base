import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotificationStore } from './notification.store'

describe('useNotificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('push возвращает id и добавляет элемент в очередь', () => {
    const store = useNotificationStore()
    const id = store.push({ message: 'hello' })
    expect(id).toBeTypeOf('string')
    expect(id.length).toBeGreaterThan(0)
    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.message).toBe('hello')
    expect(store.items[0]?.kind).toBe('info')
  })

  it('default timeout зависит от kind: info=4000, warning=6000, error=0', () => {
    const store = useNotificationStore()
    store.push({ kind: 'info', message: 'i' }, { kind: 'warning', message: 'w' }, { kind: 'error', message: 'e' })
    expect(store.items[0]?.timeout).toBe(4000)
    expect(store.items[1]?.timeout).toBe(6000)
    expect(store.items[2]?.timeout).toBe(0)
  })

  it('явный timeout перекрывает default', () => {
    const store = useNotificationStore()
    store.push({ kind: 'error', message: 'e', timeout: 1500 })
    expect(store.items[0]?.timeout).toBe(1500)
  })

  it('notifyError — алиас на push с kind=error', () => {
    const store = useNotificationStore()
    const id = store.notifyError('что-то пошло не так')
    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.id).toBe(id)
    expect(store.items[0]?.kind).toBe('error')
    expect(store.items[0]?.message).toBe('что-то пошло не так')
  })

  it('dismiss удаляет элемент по id', () => {
    const store = useNotificationStore()
    const id1 = store.push({ message: 'a' })
    const id2 = store.push({ message: 'b' })
    store.dismiss(id1)
    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.id).toBe(id2)
  })

  it('dismiss несуществующего id — no-op', () => {
    const store = useNotificationStore()
    store.push({ message: 'a' })
    store.dismiss('ghost')
    expect(store.items).toHaveLength(1)
  })

  it('clear удаляет все элементы', () => {
    const store = useNotificationStore()
    store.push({ message: 'a' }, { message: 'b' })
    store.clear()
    expect(store.items).toHaveLength(0)
  })
})
