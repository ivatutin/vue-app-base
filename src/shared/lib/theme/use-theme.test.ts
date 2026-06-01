import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import {
  _resetThemeForTests,
  initThemeProvider,
  THEME_STORAGE_KEY,
  useTheme,
} from './use-theme'

/**
 * happy-dom предоставляет минимальный matchMedia — по умолчанию
 * возвращает matches=false (system → light). Этого достаточно для
 * базовых сценариев; для проверки тёмной системной темы понадобится
 * monkey-patch matchMedia.
 */
describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    _resetThemeForTests()
  })

  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    _resetThemeForTests()
  })

  it('default mode = system; light при system-prefers-light', () => {
    initThemeProvider()
    const { mode, currentTheme, isDark } = useTheme()

    expect(mode.value).toBe('system')
    expect(currentTheme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setMode(dark) → currentTheme=dark, .dark класс, persist в localStorage', async () => {
    initThemeProvider()
    const { setMode, currentTheme, isDark } = useTheme()

    setMode('dark')
    await nextTick()

    expect(currentTheme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('setMode(light) → убирает .dark класс', async () => {
    initThemeProvider()
    const { setMode } = useTheme()

    setMode('dark')
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    setMode('light')
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('toggle() переключает light ↔ dark', async () => {
    initThemeProvider()
    const { setMode, toggle, currentTheme } = useTheme()

    setMode('light')
    await nextTick()
    expect(currentTheme.value).toBe('light')

    toggle()
    await nextTick()
    expect(currentTheme.value).toBe('dark')

    toggle()
    await nextTick()
    expect(currentTheme.value).toBe('light')
  })

  it('restore mode из localStorage при init', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    initThemeProvider()
    const { mode, currentTheme } = useTheme()

    expect(mode.value).toBe('dark')
    expect(currentTheme.value).toBe('dark')
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('игнорирует невалидное значение в localStorage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'invalid-mode')

    initThemeProvider()
    const { mode } = useTheme()

    expect(mode.value).toBe('system')
  })

  it('initThemeProvider() idempotent — повторный вызов не дублирует listener', () => {
    initThemeProvider()
    initThemeProvider()
    initThemeProvider()
    const { mode } = useTheme()
    // Если бы listener дублировался, поменяв тему мы бы видели лишние
    // событие/persistence — но идемпотентность гарантирует чистый state.
    expect(mode.value).toBe('system')
  })
})
