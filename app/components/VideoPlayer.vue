<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  src: string | null
  poster?: string | null
  title: string
  autoplay?: boolean
}>(), {
  poster: null,
  autoplay: false,
})

const emit = defineEmits<{
  play: []
  pause: []
  ended: []
  timeupdate: [currentTime: number, duration: number]
}>()

const videoEl = ref<HTMLVideoElement | null>(null)
const started = ref(false)
const failed = ref(false)

function play() {
  const element = videoEl.value
  if (!element) return
  started.value = true
  element.play().catch(() => {
    started.value = false
  })
}

function onPlay() {
  started.value = true
  failed.value = false
  emit('play')
}

function onTime() {
  const element = videoEl.value
  if (!element) return
  emit('timeupdate', element.currentTime || 0, element.duration || 0)
}

function onPause() {
  emit('pause')
}

function onEnded() {
  emit('ended')
}

watch(() => props.src, () => {
  started.value = false
  failed.value = false
})

onMounted(() => {
  if (props.autoplay) play()
})

defineExpose({ play })
</script>

<template>
  <div class="player-shell">
    <div class="player-frame">
      <video
        v-if="src"
        ref="videoEl"
        class="player-video"
        :src="src"
        :poster="poster || undefined"
        controls
        playsinline
        preload="metadata"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @timeupdate="onTime"
        @error="failed = true"
      />

      <button
        v-if="!started && !failed"
        class="player-overlay"
        type="button"
        :aria-label="`播放 ${title}`"
        @click="play"
      >
        <img v-if="poster" class="overlay-poster" :src="poster" :alt="title">
        <div class="overlay-veil" />
        <span class="overlay-play">
          <AppIcon name="play" :size="28" />
        </span>
        <span class="overlay-caption">PLAY FILM</span>
      </button>

      <div v-if="!src" class="player-state">
        <AppIcon name="video" :size="28" />
        <strong>播放地址尚未就绪</strong>
        <span>该影片可能仍在处理中，请稍后再来。</span>
      </div>

      <div v-else-if="failed" class="player-state">
        <AppIcon name="alert" :size="28" />
        <strong>无法播放这支影片</strong>
        <span>播放地址可能已过期，刷新页面后再试。</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="() => { failed = false; play() }">重新加载</button>
      </div>
    </div>

    <div class="player-caption">
      <span>NOW PLAYING</span>
      <span>{{ title }}</span>
    </div>
  </div>
</template>

<style scoped>
.player-shell {
  display: grid;
  gap: 12px;
}

.player-frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: #05060a;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
}

.player-frame::after {
  position: absolute;
  inset: 0;
  z-index: 5;
  border: 1px solid rgba(243, 239, 228, 0.08);
  border-radius: inherit;
  content: "";
  pointer-events: none;
}

.player-video {
  width: 100%;
  height: 100%;
  background: #05060a;
  object-fit: contain;
}

.player-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  overflow: hidden;
  padding: 0;
  place-items: center;
  color: var(--ink);
  background: transparent;
  cursor: pointer;
}

.overlay-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.6) saturate(1.1);
  transition: transform 1.2s var(--ease-out), filter 400ms ease;
}
.player-overlay:hover .overlay-poster {
  transform: scale(1.035);
  filter: brightness(0.52) saturate(1.1);
}
.overlay-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 45%, transparent 10%, rgba(5, 6, 9, 0.3) 60%),
    linear-gradient(to top, rgba(5, 6, 9, 0.75), transparent 50%);
}
.overlay-play {
  position: relative;
  z-index: 2;
  display: grid;
  width: 92px;
  height: 92px;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.42);
  border-radius: 50%;
  color: #171208;
  background: var(--amber);
  box-shadow: 0 0 0 14px rgba(243, 184, 95, 0.08), 0 24px 60px rgba(0, 0, 0, 0.45);
  transition: transform 320ms var(--ease-out), box-shadow 320ms ease;
}
.overlay-play :deep(svg) {
  margin-left: 5px;
}
.player-overlay:hover .overlay-play {
  transform: scale(1.07);
  box-shadow: 0 0 0 22px rgba(243, 184, 95, 0.07), 0 30px 70px rgba(0, 0, 0, 0.5);
}
.overlay-caption {
  position: absolute;
  bottom: 30px;
  z-index: 2;
  color: rgba(243, 239, 228, 0.62);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.24em;
}

.player-state {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 9px;
  padding: 24px;
  color: var(--ink-soft);
  background: rgba(5, 6, 10, 0.9);
  text-align: center;
}
.player-state :deep(svg) {
  color: var(--amber);
}
.player-state strong {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
}
.player-state span {
  color: var(--muted);
  font-size: 11.5px;
}

.player-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 4px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
}
.player-caption span:last-child {
  overflow: hidden;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .overlay-play {
    width: 64px;
    height: 64px;
  }
  .overlay-play :deep(svg) {
    width: 22px;
    height: 22px;
  }
  .player-frame {
    border-radius: var(--radius);
  }
  .overlay-caption {
    bottom: 18px;
  }
}
</style>
