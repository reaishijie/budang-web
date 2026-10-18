import type { SiteSettings } from '~/types'

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  name: '光影',
  description: '发现、收藏和分享值得观看的视频。',
  icon: '/favicon.ico',
  keywords: '视频,独立影像,纪录片,放映室,光影',
}

export function useSiteSettings() {
  return useState<SiteSettings>('video-site-settings', () => ({ ...DEFAULT_SITE_SETTINGS }))
}
