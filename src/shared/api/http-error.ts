export class HttpError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly errorName: string
  public readonly details: unknown
  /** Исходная ошибка (`TypeError` от fetch и т.п.). В lib ES2021 у Error поля нет. */
  public cause?: unknown

  constructor (
    status: number,
    statusText: string,
    errorName: string,
    message: string | string[],
    details?: unknown,
    cause?: unknown,
  ) {
    super(Array.isArray(message) ? message.join('; ') : message)
    // Присваиваем вручную, а не через `super(msg, { cause })`:
    // ErrorOptions требует lib ES2022, поднимать её ради одного поля не стоит.
    if (cause !== undefined) {
      this.cause = cause
    }
    this.name = 'HttpError'
    this.status = status
    this.statusText = statusText
    this.errorName = errorName
    this.details = details
  }

  /**
   * Транспорт не состоялся: HTTP-ответа не было вовсе (DNS, отказ
   * соединения, CORS, обрыв). `status: 0` — маркер этого класса ошибок.
   *
   * Существует, чтобы вызывающий код мог опираться на единый
   * `instanceof HttpError` вместо голого `TypeError: Failed to fetch`.
   */
  static network (cause?: unknown): HttpError {
    return new HttpError(0, '', 'NetworkError', 'Не удалось связаться с сервером', undefined, cause)
  }

  /** Сервер не ответил за отведённое время (`AbortSignal.timeout`). */
  static timeout (timeoutMs: number, cause?: unknown): HttpError {
    return new HttpError(
      0,
      '',
      'TimeoutError',
      `Сервер не ответил за ${timeoutMs} мс`,
      undefined,
      cause,
    )
  }
}
