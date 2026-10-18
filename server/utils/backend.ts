import { createError, getHeader, getRequestURL, setResponseStatus } from 'h3'
import type { H3Event } from 'h3'

export interface BackendResult {
  status: number
  body: unknown
}

export interface BackendRequestOptions {
  method?: string
  body?: unknown
  accessToken?: string
}

export async function requestBackend(
  event: H3Event,
  path: string,
  options: BackendRequestOptions = {},
): Promise<BackendResult> {
  const config = useRuntimeConfig(event)
  const apiBaseUrl = String(config.apiBaseUrl).replace(/\/+$/, '')
  const method = options.method ?? 'GET'
  const headers = new Headers({ Accept: 'application/json' })
  let body: string | undefined

  if (options.accessToken) headers.set('Authorization', `Bearer ${options.accessToken}`)
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  try {
    const response = await fetch(`${apiBaseUrl}/${path}`, {
      method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    })
    const text = await response.text()
    let responseBody: unknown
    try {
      responseBody = text ? JSON.parse(text) : null
    } catch {
      responseBody = {
        success: false,
        code: response.status,
        message: '后端返回了无法识别的响应',
        data: null,
      }
    }
    return { status: response.status, body: responseBody }
  } catch {
    return {
      status: 502,
      body: {
        success: false,
        code: 502,
        message: '暂时无法连接视频服务，请稍后重试',
        data: null,
        errorCode: 'UPSTREAM_UNAVAILABLE',
      },
    }
  }
}

export function forwardBackendResult(event: H3Event, result: BackendResult) {
  setResponseStatus(event, result.status)
  return result.body
}

export function assertSameOrigin(event: H3Event): void {
  const origin = getHeader(event, 'origin')
  const fetchSite = getHeader(event, 'sec-fetch-site')

  if (fetchSite && fetchSite !== 'same-origin') {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
  }
  if (!origin && fetchSite !== 'same-origin') {
    throw createError({ statusCode: 403, statusMessage: 'Request origin is required' })
  }
  if (origin) {
    try {
      if (new URL(origin).origin !== getRequestURL(event).origin) {
        throw createError({ statusCode: 403, statusMessage: 'Cross-origin request blocked' })
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) throw error
      throw createError({ statusCode: 403, statusMessage: 'Invalid request origin' })
    }
  }
}
