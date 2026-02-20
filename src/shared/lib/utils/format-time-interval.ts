import { plural } from './plural'
export function formatTimeInterval(seconds: number, shortFromat = false) {
  const units = {
    y: ['г',  [' год', ' года', ' лет']],
    d: ['дн', [' день', ' дня', ' дней']],
    h: ['ч',  [' час', ' часа', ' часов']],
    m: ['м',  [' мин', ' мин', ' мин']],
    s: ['с',  [' сек', ' сек', ' сек']],
  } as const
  const y = Math.floor(seconds / 31536000)
  const d = Math.floor((seconds % 31536000) / 86400)
  const h = Math.floor(((seconds % 31536000) % 86400) / 3600)
  const m = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60)
  const s = Math.floor((((seconds % 31536000) % 86400) % 3600) % 60)
  return [
    String(y) + (shortFromat ? units.y[0] : plural(y, units.y[1])),
    String(d) + (shortFromat ? units.y[0] : plural(d, units.d[1])),
    String(h) + (shortFromat ? units.y[0] : plural(h, units.h[1])),
    String(m) + (shortFromat ? units.y[0] : plural(m, units.m[1])),
    String(s) + (shortFromat ? units.y[0] : plural(s, units.s[1])),
  ]
    .filter((v) => parseInt(v) > 0)
    .join(' ')
}