import { ApiRequestError } from '~/composables/useApi'

export default defineNuxtRouteMiddleware(async (to) => {
  const isAdminRoute = to.path === '/admin' || to.path.startsWith('/admin/')
  const guestOnly = ['/login', '/register'].includes(to.path)
  const requiresLogin = isAdminRoute || [
    '/account',
    '/favorites',
    '/history',
    '/upload',
    '/my/videos',
  ].some(path => to.path === path || to.path.startsWith(`${path}/`))

  if (!requiresLogin && !guestOnly) return

  const auth = useAuth()
  let user

  try {
    user = await auth.loadUser(true)
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      user = null
    } else if (requiresLogin) {
      throw createError({ statusCode: 503, statusMessage: '暂时无法验证登录状态，请稍后重试。' })
    } else {
      return
    }
  }

  if (guestOnly) {
    if (user) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/'
      return navigateTo(redirect.startsWith('/') ? redirect : '/')
    }
    return
  }

  if (!user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (isAdminRoute && user.role !== 'ADMIN') {
    return navigateTo('/403')
  }
})
