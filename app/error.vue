<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    statusMessage?: string
    message?: string
  }
}>()

const title = computed(() => props.error.statusCode === 404 ? '这一格胶片是空的' : '放映机卡住了')
const message = computed(() => props.error.statusCode === 404
  ? '你寻找的页面可能已经散场，或者从未被放映。'
  : '服务器暂时没有回应。请稍后再试，或回到首页重新开始。')

useHead({ title })
</script>

<template>
  <div class="error-page">
    <div class="error-glow" aria-hidden="true" />
    <ThemeToggle class="error-theme" />
    <div class="error-card">
      <span class="error-code">{{ error.statusCode || 500 }}</span>
      <p class="eyebrow">PROJECTION INTERRUPTED</p>
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
      <div class="error-actions">
        <button class="btn btn-primary" type="button" @click="clearError({ redirect: '/' })">
          回到首页
        </button>
        <button class="btn btn-ghost" type="button" @click="clearError()">
          重试一次
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  overflow: hidden;
  place-items: center;
  padding: 30px;
}
.error-theme {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 2;
}
.error-glow {
  position: absolute;
  width: 70vw;
  height: 70vw;
  max-width: 760px;
  max-height: 760px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(243, 184, 95, 0.1), transparent 65%);
  filter: blur(20px);
}
.error-card {
  position: relative;
  display: grid;
  max-width: 560px;
  justify-items: start;
  gap: 18px;
  padding: clamp(28px, 5vw, 58px);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: rgba(15, 18, 24, 0.6);
  backdrop-filter: blur(20px);
}
.error-code {
  color: var(--amber);
  font-family: var(--font-display);
  font-size: 108px;
  line-height: 0.8;
}
.error-card h1 {
  font-family: var(--font-display);
  font-size: clamp(34px, 5vw, 50px);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.08;
}
.error-card > p:not(.eyebrow) {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}
.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
</style>
