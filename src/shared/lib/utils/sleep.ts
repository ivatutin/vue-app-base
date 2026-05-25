export function sleep (ms: number, options?: { return?: any, signal?: AbortSignal }): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => (undefined === options?.return ? resolve() : resolve(options.return)),
      ms,
    )
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        reject(new Error('Sleep aborted'))
      })
    }
  })
}
