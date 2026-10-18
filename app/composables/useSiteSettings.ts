import type { SiteSettings } from '~/types'

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  name: '补档',
  description: '补回错过的影片，收藏值得重看的影像。',
  icon: '/favicon.ico',
  keywords: '视频,视频分享,在线观看,补档,影像档案',
}

export function useSiteSettings() {
  return useState<SiteSettings>('video-site-settings', () => ({ ...DEFAULT_SITE_SETTINGS }))
}
