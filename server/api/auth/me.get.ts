import { setResponseStatus } from 'h3'
import { forwardBackendResult, requestBackend } from '../../utils/backend'
import { getAccessToken } from '../../utils/auth-cookies'

export default defineEventHandler(async (event) => {
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

  return forwardBackendResult(event, await requestBackend(event, 'api/auth/me', { accessToken }))
})
