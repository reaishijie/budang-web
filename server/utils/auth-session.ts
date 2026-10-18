import type { H3Event } from 'h3'
import { requestBackend } from './backend'
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from './auth-cookies'
import type { BackendTokens } from './auth-cookies'

interface AuthEnvelope {
  success?: boolean
  message?: string
  data?: {
    user?: unknown
    tokens?: BackendTokens
  }
}

export async function refreshFromCookie(event: H3Event) {
  const refreshToken = getRefreshToken(event)
  if (!refreshToken) return null

  const result = await requestBackend(event, 'api/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  })
  const envelope = result.body as AuthEnvelope

  if (
    result.status < 400 &&
    envelope?.success &&
    envelope.data?.tokens?.accessToken &&
    envelope.data.tokens.refreshToken
  ) {
    setAuthCookies(event, envelope.data.tokens)
    return {
      accessToken: envelope.data.tokens.accessToken,
      user: envelope.data.user,
      result,
    }
  }

  if (result.status === 401) clearAuthCookies(event)
  return { accessToken: null, user: null, result }
}

export async function revokeSession(event: H3Event, endpoint: 'logout' | 'logout-all') {
  let accessToken = getAccessToken(event)
  const refreshToken = getRefreshToken(event)

  if (accessToken) {
    let result = await requestBackend(event, `api/auth/${endpoint}`, {
      method: 'POST',
      accessToken,
    })

    if (result.status === 401 && refreshToken) {
      const refreshed = await refreshFromCookie(event)
      if (refreshed?.accessToken) {
        accessToken = refreshed.accessToken
        result = await requestBackend(event, `api/auth/${endpoint}`, {
          method: 'POST',
          accessToken,
        })
      } else if (refreshed?.result.status === 502) {
        clearAuthCookies(event)
        return refreshed.result
      }
    }

    clearAuthCookies(event)
    if (result.status === 401) {
      return {
        status: 200,
        body: { success: true, code: 200, message: '本地登录凭证已清除', data: null },
      }
    }
    return result
  }

  if (refreshToken) {
    const refreshed = await refreshFromCookie(event)
    if (refreshed?.accessToken) {
      const result = await requestBackend(event, `api/auth/${endpoint}`, {
        method: 'POST',
        accessToken: refreshed.accessToken,
      })
      clearAuthCookies(event)
      return result
    }
    if (refreshed?.result.status === 502) {
      clearAuthCookies(event)
      return refreshed.result
    }
  }

  clearAuthCookies(event)
  return {
    status: 200,
    body: { success: true, code: 200, message: '已退出登录', data: null },
  }
}
