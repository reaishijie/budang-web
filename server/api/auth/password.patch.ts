import { readBody, setResponseStatus } from 'h3'
import { assertSameOrigin, requestBackend } from '../../utils/backend'
import { clearAuthCookies, getAccessToken } from '../../utils/auth-cookies'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const accessToken = getAccessToken(event)
  if (!accessToken) {
    setResponseStatus(event, 401)
    return {
      success: false,
      code: 401,
      message: '请先登录',
      data: null,
      errorCode: 'AUTH_REQUIRED',
    }
  }

  const body = await readBody(event)
  const result = await requestBackend(event, 'api/auth/password', {
    method: 'PATCH',
    body,
    accessToken,
  })

  if (result.status < 400) {
    // 后端修改密码后会吊销全部会话，本地 Cookie 也一并清除。
    clearAuthCookies(event)
  }

  setResponseStatus(event, result.status)
  return result.body
})
