import { getHeader, getRequestURL, getRouterParam, readRawBody, setResponseStatus } from 'h3'
import { assertSameOrigin } from '../../utils/backend'
import { getAccessToken } from '../../utils/auth-cookies'

const endpointRules: Array<{ path: RegExp; methods: string[] }> = [
  { path: /^api\/health$/, methods: ['GET'] },

  { path: /^api\/users\/[^/]+\/upload-permission$/, methods: ['PATCH'] },
  { path: /^api\/users\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { path: /^api\/users$/, methods: ['GET'] },

  { path: /^api\/categories$/, methods: ['GET', 'POST'] },
  { path: /^api\/categories\/\d+$/, methods: ['GET', 'PATCH', 'DELETE'] },

  { path: /^api\/tags$/, methods: ['GET', 'POST'] },
  { path: /^api\/tags\/\d+$/, methods: ['PATCH', 'DELETE'] },

  { path: /^api\/videos\/admin\/review-queue$/, methods: ['GET'] },
  { path: /^api\/videos\/admin\/missing-durations$/, methods: ['GET'] },
  { path: /^api\/videos\/mine$/, methods: ['GET'] },
  { path: /^api\/videos$/, methods: ['GET', 'POST'] },
  { path: /^api\/videos\/\d+\/status$/, methods: ['PATCH'] },
  { path: /^api\/videos\/\d+\/resubmit$/, methods: ['POST'] },
  { path: /^api\/videos\/\d+\/vote$/, methods: ['PUT'] },
  { path: /^api\/videos\/\d+\/favorite$/, methods: ['PUT'] },
  { path: /^api\/videos\/\d+\/view$/, methods: ['POST'] },
  { path: /^api\/videos\/\d+\/progress$/, methods: ['PUT'] },
  { path: /^api\/videos\/\d+\/comments\/\d+\/vote$/, methods: ['PUT'] },
  { path: /^api\/videos\/\d+\/comments\/\d+$/, methods: ['DELETE'] },
  { path: /^api\/videos\/\d+\/comments$/, methods: ['GET', 'POST'] },
  { path: /^api\/videos\/\d+\/danmaku$/, methods: ['GET', 'POST'] },
  { path: /^api\/videos\/\d+\/danmaku\/\d+$/, methods: ['DELETE'] },
  { path: /^api\/videos\/\d+$/, methods: ['GET', 'PATCH', 'DELETE'] },

  { path: /^api\/favorites$/, methods: ['GET'] },
  { path: /^api\/history$/, methods: ['GET', 'DELETE'] },
  { path: /^api\/history\/\d+$/, methods: ['DELETE'] },

  { path: /^api\/uploads\/presign$/, methods: ['POST'] },
  { path: /^api\/uploads\/[A-Za-z0-9_-]{1,40}\/complete$/, methods: ['POST'] },
  { path: /^api\/files$/, methods: ['GET'] },
  { path: /^api\/files\/[A-Za-z0-9_-]{1,40}$/, methods: ['GET'] },

  { path: /^api\/configs$/, methods: ['GET', 'POST'] },
  { path: /^api\/configs\/types$/, methods: ['GET'] },
  { path: /^api\/configs\/\d+$/, methods: ['PATCH', 'DELETE'] },
  { path: /^api\/configs\/[^/]+\/[^/]+$/, methods: ['GET'] },

  { path: /^api\/energy\/me$/, methods: ['GET'] },
  { path: /^api\/energy\/transactions$/, methods: ['GET'] },
  { path: /^api\/energy\/adjust$/, methods: ['POST'] },
]

function isAllowed(path: string, method: string): boolean {
  return endpointRules.some(rule => rule.path.test(path) && rule.methods.includes(method))
}

function errorResponse(event: Parameters<typeof setResponseStatus>[0], status: number, message: string) {
  setResponseStatus(event, status)
  return { success: false, code: status, message, data: null }
}

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')?.replace(/^\/+|\/+$/g, '') ?? ''
  const method = event.method.toUpperCase()

  if (!isAllowed(path, method)) {
    return errorResponse(
      event,
      endpointRules.some(rule => rule.path.test(path)) ? 405 : 404,
      '不支持的 API 请求',
    )
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    try {
      assertSameOrigin(event)
    } catch {
      return errorResponse(event, 403, '请求来源校验失败')
    }
  }

  const config = useRuntimeConfig(event)
  const apiBaseUrl = String(config.apiBaseUrl).replace(/\/+$/, '')
  const requestUrl = getRequestURL(event)
  const headers = new Headers({ Accept: getHeader(event, 'accept') ?? 'application/json' })
  const contentType = getHeader(event, 'content-type')
  const accessToken = getAccessToken(event)

  if (contentType) headers.set('Content-Type', contentType)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  try {
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await readRawBody(event, false)
    const upstream = await fetch(`${apiBaseUrl}/${path}${requestUrl.search}`, {
      method,
      headers,
      body: body ? Uint8Array.from(body) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    })

    const responseHeaders = {
      'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch {
    return errorResponse(event, 502, '暂时无法连接视频服务')
  }
})
