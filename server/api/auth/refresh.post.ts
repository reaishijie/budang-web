import { setResponseStatus } from 'h3'
import { assertSameOrigin } from '../../utils/backend'
import { clearAuthCookies } from '../../utils/auth-cookies'
import { refreshFromCookie } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const refreshed = await refreshFromCookie(event)

  if (!refreshed) {
    clearAuthCookies(event)
    setResponseStatus(event, 401)
    return {
      success: false,
      code: 401,
      message: '登录已过期，请重新登录',
      data: null,
      errorCode: 'AUTH_REFRESH_EXPIRED',
    }
  }

  setResponseStatus(event, refreshed.result.status)
  if (refreshed.accessToken) {
    const body = refreshed.result.body as { success?: boolean; code?: number; message?: string }
    return {
      ...body,
      data: { user: refreshed.user },
    }
  }

  return refreshed.result.body
})
