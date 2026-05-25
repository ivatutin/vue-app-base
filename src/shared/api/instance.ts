import type { HttpClient } from './http-client'

let instance: HttpClient | null = null

export function setHttpClient (client: HttpClient): void {
  instance = client
}

export function getHttpClient (): HttpClient {
  if (!instance) {
    throw new Error('HttpClient not initialized. Call setupHttpClient(app) first.')
  }
  return instance
}
