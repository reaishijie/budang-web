import { readBody, setResponseStatus } from 'h3'
import { assertSameOrigin, requestBackend } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const body = await readBody(event)
  const result = await requestBackend(event, 'api/auth/register', { method: 'POST', body })
  setResponseStatus(event, result.status)
  return result.body
})
