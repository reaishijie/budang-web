<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_SITE_SETTINGS, useSiteSettings } from '~/composables/useSiteSettings'
import { safeHttpUrl } from '~/utils/url'

const siteSettings = useSiteSettings()
const auth = useAuth()
const videoApi = useVideoApi()

await useAsyncData('video-bootstrap', async () => {
  const [settingsResult, userResult] = await Promise.allSettled([
    videoApi.listConfigs({ type: 'APP', pageSize: 100 }),
    auth.loadUser(),
  ])

  if (settingsResult.status === 'fulfilled') {
    const valueFor = (key: string, fallback: string) =>
      settingsResult.value.items.find(item => item.k === key)?.v.trim() || fallback

    siteSettings.value = {
      name: valueFor('SITE_NAME', DEFAULT_SITE_SETTINGS.name),
      description: valueFor('SITE_DESCRIPTION', DEFAULT_SITE_SETTINGS.description),
      icon: valueFor('SITE_ICON', DEFAULT_SITE_SETTINGS.icon),
      keywords: valueFor('SITE_KEYWORDS', DEFAULT_SITE_SETTINGS.keywords),
    }
  }

  return {
    user: userResult.status === 'fulfilled' ? userResult.value : null,
  }
})

const iconHref = computed(() => {
  const icon = siteSettings.value.icon.trim()
  if (icon.startsWith('/') && !icon.startsWith('//')) return icon
  return safeHttpUrl(icon) || DEFAULT_SITE_SETTINGS.icon
})

useHead(() => ({
  titleTemplate: (title?: string) => title ? `${title} · ${siteSettings.value.name}` : '补档放映室',
  link: [
    { rel: 'icon', href: iconHref.value },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
  meta: [
    { name: 'description', content: siteSettings.value.description },
    { name: 'keywords', content: siteSettings.value.keywords },
    { property: 'og:site_name', content: siteSettings.value.name },
  ],
}))
</script>

<template>
  <div>
    <NuxtLoadingIndicator color="#f3b85f" :height="2" :throttle="120" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ToastHost />
  </div>
</template>
