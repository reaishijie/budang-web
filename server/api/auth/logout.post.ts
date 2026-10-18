import { setResponseStatus } from 'h3'
import { assertSameOrigin, forwardBackendResult } from '../../utils/backend'
import { revokeSession } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const result = await revokeSession(event, 'logout')
  setResponseStatus(event, result.status)
  return result.body
})
