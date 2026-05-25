import { HttpError } from './http-error'

export interface HttpClientOptions {
  baseUrl: string
  getAccessToken?: () => string | null
  /**
   * Возвращает `true`, если можно повторить запрос с новым токеном;
   * `false` — клиент бросит исходный HttpError 401.
   */
  onUnauthorized?: () => Promise<boolean>
}

export interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined | null>
  /** `false` для public endpoints (sign-in, refresh) — не добавлять Bearer-header. */
  auth?: boolean
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ErrorResponseBody {
  statusCode?: number
  error?: string
  message?: string | string[]
  details?: unknown
}

export class HttpClient {
  private refreshPromise: Promise<boolean> | null = null

  constructor (private readonly options: HttpClientOptions) {}

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options)
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options)
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options)
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options)
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options)
  }

  private async request<T>(
    method: Method,
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    let response = await this.execute(method, path, body, options)

    if (response.status === 401 && this.options.onUnauthorized && options.auth !== false) {
      const retried = await this.retryAfterRefresh()
      if (retried) {
        response = await this.execute(method, path, body, options)
      }
    }

    return this.parseResponse<T>(response)
  }

  private async execute (
    method: Method,
    path: string,
    body: unknown,
    options: RequestOptions,
  ): Promise<Response> {
    const url = this.buildUrl(path, options.query)
    const headers: Record<string, string> = { ...options.headers }

    if (options.auth !== false) {
      const token = this.options.getAccessToken?.()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    let bodyInit: BodyInit | undefined
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      bodyInit = JSON.stringify(body)
    }

    return fetch(url, {
      method,
      headers,
      body: bodyInit,
      signal: options.signal,
    })
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')
    const payload: unknown = isJson ? await response.json().catch(() => undefined) : undefined

    if (!response.ok) {
      const body = (payload ?? {}) as ErrorResponseBody
      const errorName = body.error ?? response.statusText ?? 'HttpError'
      const message = body.message ?? `HTTP ${response.status} ${response.statusText}`
      throw new HttpError(response.status, response.statusText, errorName, message, body.details)
    }

    return payload as T
  }

  /**
   * Single-flight refresh: одновременные 401 ждут один и тот же promise,
   * запуская onUnauthorized ровно один раз.
   */
  private retryAfterRefresh (): Promise<boolean> {
    if (!this.options.onUnauthorized) {
      return Promise.resolve(false)
    }
    this.refreshPromise ??= this.options
      .onUnauthorized()
      .finally(() => {
        this.refreshPromise = null
      })
    return this.refreshPromise
  }

  private buildUrl (path: string, query?: RequestOptions['query']): string {
    const isAbsoluteBase = /^https?:\/\//i.test(this.options.baseUrl)
    const base = isAbsoluteBase ? this.options.baseUrl : `${window.location.origin}${this.options.baseUrl}`
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path
    const url = new URL(normalizedPath, normalizedBase)

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    return url.toString()
  }
}
