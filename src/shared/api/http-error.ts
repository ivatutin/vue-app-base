export class HttpError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly errorName: string
  public readonly details: unknown

  constructor(
    status: number,
    statusText: string,
    errorName: string,
    message: string | string[],
    details?: unknown,
  ) {
    super(Array.isArray(message) ? message.join('; ') : message)
    this.name = 'HttpError'
    this.status = status
    this.statusText = statusText
    this.errorName = errorName
    this.details = details
  }
}
