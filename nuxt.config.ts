// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  devServer: { port: 5173 },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'theme-color', content: '#08090c' },
        { name: 'color-scheme', content: 'dark' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    apiBaseUrl: 'http://localhost:3000',
    public: {
      siteUrl: '',
    },
  },
  // 与后端一致，使用 Bun 运行 Nitro 产物
  nitro: { preset: 'bun' },
})
