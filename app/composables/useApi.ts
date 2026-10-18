import type { ApiEnvelope, AuthUser } from '~/types'

export class ApiRequestError extends Error {
  readonly status: number
  readonly errorCode?: string

  constructor(message: string, status = 0, errorCode?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.errorCode = errorCode
  }
}

interface FetchFailure {
  message?: string
  status?: number
  statusCode?: number
  data?: Partial<ApiEnvelope<unknown>>
  response?: {
    _data?: Partial<ApiEnvelope<unknown>>
    status?: number
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

let browserRefreshPromise: Promise<void> | null = null

function cleanQuery(query?: Query): Record<string, string | number | boolean> | undefined {
  if (!query) return undefined
  const result: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') result[key] = value
  }
  return Object.keys(result).length ? result : undefined
}

export function useApi() {
  const fetcher = useRequestFetch()
  const authUser = useState<AuthUser | null>('video-auth-user', () => null)
  const authInitialized = useState('video-auth-initialized', () => false)

  function toApiError(cause: unknown): ApiRequestError {
    if (cause instanceof ApiRequestError) return cause

    const failure = cause as FetchFailure
    const body = failure.data ?? failure.response?._data
    const status = failure.statusCode ?? failure.status ?? failure.response?.status ?? body?.code ?? 0
    const message = typeof body?.message === 'string'
      ? body.message
      : status === 0
        ? '暂时无法连接光影服务，请稍后重试。'
        : failure.message || '请求失败，请稍后重试。'

    return new ApiRequestError(message, status, body?.errorCode)
  }

  async function requestOnce<T>(path: string, options: Record<string, unknown> = {}): Promise<T> {
    try {
      const response = await fetcher<ApiEnvelope<T>>(path, {
        ...options,
        credentials: 'same-origin',
        retry: 0,
      })

      if (!response?.success) {
        throw new ApiRequestError(response?.message || '请求失败', response?.code, response?.errorCode)
      }
      return response.data
    } catch (cause) {
      throw toApiError(cause)
    }
  }

  async function refreshSession(): Promise<void> {
    const doRefresh = async () => {
      const requestWithCrossTabLock = async () => {
        try {
          authUser.value = await requestOnce<AuthUser>('/api/auth/me')
          authInitialized.value = true
          return
        } catch (cause) {
          if (toApiError(cause).status !== 401) throw cause
        }

        const refreshed = await requestOnce<{ user: AuthUser }>('/api/auth/refresh', {
          method: 'POST',
          body: {},
        })
        authUser.value = refreshed.user
        authInitialized.value = true
      }

      if (import.meta.client && navigator.locks) {
        await navigator.locks.request('video-auth-refresh', requestWithCrossTabLock)
      } else {
        await requestWithCrossTabLock()
      }
    }

    if (!import.meta.client) {
      await doRefresh()
      return
    }

    if (browserRefreshPromise) return browserRefreshPromise
    browserRefreshPromise = doRefresh()
    try {
      await browserRefreshPromise
    } finally {
      browserRefreshPromise = null
    }
  }

  async function request<T>(path: string, options: Record<string, unknown> = {}): Promise<T> {
    try {
      return await requestOnce<T>(path, options)
    } catch (cause) {
      const error = toApiError(cause)
      const authMutation = /^\/api\/auth\/(?:login|register|refresh|logout|logout-all|password)$/.test(path)

      if (error.status !== 401 || authMutation || !import.meta.client) throw error

      try {
        await refreshSession()
        return await requestOnce<T>(path, options)
      } catch (refreshError) {
        authUser.value = null
        authInitialized.value = true
        throw toApiError(refreshError)
      }
    }
  }

  return {
    get: <T>(path: string, query?: Query) =>
      request<T>(path, { method: 'GET', ...(cleanQuery(query) ? { query: cleanQuery(query) } : {}) }),
    post: <T>(path: string, body?: unknown, query?: Query) =>
      request<T>(path, {
        method: 'POST',
        ...(body !== undefined ? { body } : {}),
        ...(cleanQuery(query) ? { query: cleanQuery(query) } : {}),
      }),
    patch: <T>(path: string, body: unknown, query?: Query) =>
      request<T>(path, {
        method: 'PATCH',
        body,
        ...(cleanQuery(query) ? { query: cleanQuery(query) } : {}),
      }),
    put: <T>(path: string, body: unknown, query?: Query) =>
      request<T>(path, {
        method: 'PUT',
        body,
        ...(cleanQuery(query) ? { query: cleanQuery(query) } : {}),
      }),
    delete: <T>(path: string, query?: Query) =>
      request<T>(path, { method: 'DELETE', ...(cleanQuery(query) ? { query: cleanQuery(query) } : {}) }),
  }
}
