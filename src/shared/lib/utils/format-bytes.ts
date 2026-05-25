export function formatBytes (bytes: number, decimals = 1) {
  if (!+bytes) {
    return '0B'
  }

  const k = 1024
  const dm = Math.max(decimals, 0)
  const sizes = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`
}
