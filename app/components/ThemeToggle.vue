<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { theme, toggle } = useTheme()
const nextLabel = computed(() => theme.value === 'dark' ? '切换到亮色' : '切换到暗色')

useHead({
  meta: [
    {
      name: 'theme-color',
      content: computed(() => theme.value === 'light' ? '#f2eee4' : '#08090c'),
    },
  ],
})
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="nextLabel"
    :title="nextLabel"
    @click="toggle"
  >
    <Transition name="theme-icon" mode="out-in">
      <AppIcon :key="theme" :name="theme === 'dark' ? 'sun' : 'moon'" :size="17" />
    </Transition>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--ink-soft);
  background: rgba(243, 239, 228, 0.045);
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 220ms var(--ease-out);
}
.theme-toggle:hover {
  color: var(--amber-bright);
  border-color: var(--line-strong);
  background: rgba(243, 239, 228, 0.09);
  transform: rotate(10deg);
}
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity 120ms ease, transform 180ms var(--ease-out);
}
.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-35deg) scale(0.7);
}
.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(35deg) scale(0.7);
}
</style>
