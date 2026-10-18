import { readBody, setResponseStatus } from 'h3'
import { assertSameOrigin, requestBackend } from '../../utils/backend'
import { setAuthCookies } from '../../utils/auth-cookies'
import type { BackendTokens } from '../../utils/auth-cookies'

interface LoginResponse {
  success?: boolean
  message?: string
  code?: number
  data?: {
    user?: unknown
    tokens?: BackendTokens
  }
}

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const body = await readBody(event)
  const result = await requestBackend(event, 'api/auth/login', { method: 'POST', body })
  const response = result.body as LoginResponse

  if (
    result.status < 400 &&
    response?.success &&
    response.data?.user &&
    response.data.tokens?.accessToken &&
    response.data.tokens.refreshToken
  ) {
    setAuthCookies(event, response.data.tokens)
    setResponseStatus(event, result.status)
    return {
      ...response,
      data: { user: response.data.user },
    }
  }

  setResponseStatus(event, result.status)
  return response
})
