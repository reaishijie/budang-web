<script setup lang="ts">
import { computed, ref } from 'vue'
import { avatarHue, initials } from '~/utils/format'

const props = withDefaults(defineProps<{
  name?: string | null
  username?: string | null
  avatar?: string | null
  size?: number
  ring?: boolean
}>(), {
  name: null,
  username: null,
  avatar: null,
  size: 38,
  ring: false,
})

const failed = ref(false)
const displayName = computed(() => props.name || props.username || '访客')
const hue = computed(() => avatarHue(props.username || props.name))
const showImage = computed(() => Boolean(props.avatar) && !failed.value)
</script>

<template>
  <span
    class="avatar"
    :class="{ 'avatar--ring': ring }"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      '--size': `${size}px`,
      '--avatar-hue': hue,
    }"
  >
    <img
      v-if="showImage"
      :src="avatar || undefined"
      :alt="displayName"
      loading="lazy"
      @error="failed = true"
    >
    <span v-else class="avatar-fallback">{{ initials(displayName) }}</span>
  </span>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(243, 239, 228, 0.14);
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 20%, hsl(var(--avatar-hue) 38% 42% / 0.9), transparent 62%),
    hsl(var(--avatar-hue) 22% 18%);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: calc(var(--size, 38px) * 0.34);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.avatar--ring {
  box-shadow: 0 0 0 3px rgba(243, 184, 95, 0.12);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  transform: translateY(1px);
}
</style>
