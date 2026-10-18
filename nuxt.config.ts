// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  devServer: { port: 5173 },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'color-scheme', content: 'dark light' },
      ],
      script: [
        {
          tagPosition: 'head',
          innerHTML: `(() => {
  try {
    const stored = localStorage.getItem('video-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})()`,
        },
      ],
    },
  },
  css: ['~/assets/css/main.css', '~/assets/css/theme-light.css'],
  runtimeConfig: {
    apiBaseUrl: 'http://localhost:3000',
    public: {
      siteUrl: '',
    },
  },
  // 与后端一致，使用 Bun 运行 Nitro 产物
  nitro: { preset: 'bun' },
})
