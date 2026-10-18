import { readBody, setResponseStatus } from 'h3'
import { assertSameOrigin, forwardBackendResult, requestBackend } from '../../utils/backend'
import { getAccessToken } from '../../utils/auth-cookies'

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
  return forwardBackendResult(event, await requestBackend(event, 'api/auth/me', {
    method: 'PATCH',
    body,
    accessToken,
  }))
})
