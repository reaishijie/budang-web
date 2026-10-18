import { setResponseStatus } from 'h3'
import { assertSameOrigin } from '../../utils/backend'
import { revokeSession } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const result = await revokeSession(event, 'logout-all')
  setResponseStatus(event, result.status)
  return result.body
})
