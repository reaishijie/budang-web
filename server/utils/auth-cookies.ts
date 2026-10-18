import { deleteCookie, getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'

export const ACCESS_COOKIE = import.meta.dev ? 'video_access' : '__Host-video_access'
export const REFRESH_COOKIE = import.meta.dev ? 'video_refresh' : '__Host-video_refresh'

export interface BackendTokens {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number
  refreshExpiresAt: string
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export function getAccessToken(event: H3Event): string | undefined {
  return getCookie(event, ACCESS_COOKIE)
}

export function getRefreshToken(event: H3Event): string | undefined {
  return getCookie(event, REFRESH_COOKIE)
}

export function setAuthCookies(event: H3Event, tokens: BackendTokens): void {
  const now = Date.now()
  const refreshExpiresAt = new Date(tokens.refreshExpiresAt).getTime()
  const refreshMaxAge = Number.isFinite(refreshExpiresAt)
    ? Math.floor((refreshExpiresAt - now) / 1000)
    : 60 * 60 * 24 * 30

  setCookie(event, ACCESS_COOKIE, tokens.accessToken, cookieOptions(Math.max(1, tokens.accessExpiresIn)))
  setCookie(event, REFRESH_COOKIE, tokens.refreshToken, cookieOptions(Math.max(1, refreshMaxAge)))
}

export function clearAuthCookies(event: H3Event): void {
  deleteCookie(event, ACCESS_COOKIE, cookieOptions(0))
  deleteCookie(event, REFRESH_COOKIE, cookieOptions(0))
}
