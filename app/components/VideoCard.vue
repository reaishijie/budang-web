<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Video } from '~/types'
import { formatCount, formatDuration, VIDEO_STATUS_LABEL, videoStatusTone } from '~/utils/format'

const props = withDefaults(defineProps<{
  video: Video
  rank?: number
  progress?: number
  showStatus?: boolean
}>(), {
  rank: 0,
  progress: 0,
  showStatus: false,
})

const imageFailed = ref(false)
const cover = computed(() => props.video.coverUrl && !imageFailed.value ? props.video.coverUrl : '')
const fallbackHue = computed(() => {
  let hash = 0
  for (const char of props.video.title) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
})
const statusTone = computed(() => videoStatusTone(props.video.status))
</script>

<template>
  <NuxtLink
    class="video-card"
    :to="`/videos/${video.id}`"
    :aria-label="`观看 ${video.title}`"
  >
    <div class="poster">
      <img
        v-if="cover"
        class="poster-image"
        :src="cover"
        :alt="video.title"
        loading="lazy"
        @error="imageFailed = true"
      >
      <div
        v-else
        class="poster-fallback"
        :style="{ '--fallback-hue': fallbackHue }"
      >
        <span class="fallback-word">{{ [...video.title][0] || '光' }}</span>
        <span class="fallback-caption">BUDANG ARCHIVE</span>
      </div>

      <div class="poster-shade" aria-hidden="true" />
      <span v-if="video.duration > 0" class="duration">{{ formatDuration(video.duration) }}</span>

      <span v-if="rank" class="rank" aria-hidden="true">
        <small>NO.</small>{{ String(rank).padStart(2, '0') }}
      </span>

      <span v-if="showStatus" class="status" :class="`status--${statusTone}`">
        {{ VIDEO_STATUS_LABEL[video.status] || video.status }}
      </span>

      <span class="hover-play" aria-hidden="true">
        <AppIcon name="play" :size="19" />
      </span>

      <div v-if="progress > 0" class="watch-progress" aria-hidden="true">
        <i :style="{ width: `${Math.min(100, progress)}%` }" />
      </div>
    </div>

    <div class="card-copy">
      <div class="card-topline">
        <span v-if="video.category" class="card-category">{{ video.category.name }}</span>
        <span v-else class="card-category">未分类</span>
        <span class="card-year">{{ video.publishedAt ? new Date(video.publishedAt).getFullYear() : '—' }}</span>
      </div>

      <h3 class="card-title">{{ video.title }}</h3>

      <div class="card-meta">
        <span class="meta-item">
          <AppIcon name="eye" :size="13" />
          {{ formatCount(video.counts.views) }}
        </span>
        <span class="meta-item">
          <AppIcon name="thumbsUp" :size="13" />
          {{ formatCount(video.counts.likes) }}
        </span>
        <span v-if="video.uploader" class="meta-item meta-item--uploader">
          {{ video.uploader.nickname || video.uploader.username }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.video-card {
  display: grid;
  gap: 13px;
  min-width: 0;
  transition: transform 300ms var(--ease-out);
}
.video-card:hover {
  transform: translateY(-4px);
}

.poster {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-2);
  isolation: isolate;
}
.poster::after {
  position: absolute;
  inset: 0;
  z-index: 4;
  border: 1px solid rgba(243, 239, 228, 0.16);
  border-radius: inherit;
  opacity: 0;
  content: "";
  pointer-events: none;
  transition: opacity 240ms ease;
}
.video-card:hover .poster::after {
  opacity: 1;
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 700ms var(--ease-out), filter 400ms ease;
}
.video-card:hover .poster-image {
  transform: scale(1.055);
  filter: saturate(1.08) brightness(0.82);
}

.poster-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: space-between;
  padding: 18px;
  background:
    radial-gradient(circle at 78% 22%, hsl(var(--fallback-hue) 54% 55% / 0.5), transparent 42%),
    radial-gradient(circle at 22% 82%, rgba(243, 184, 95, 0.24), transparent 44%),
    linear-gradient(140deg, hsl(var(--fallback-hue) 28% 20%), #0b0d12 72%);
}
.fallback-word {
  justify-self: end;
  align-self: center;
  color: rgba(243, 239, 228, 0.78);
  font-family: var(--font-display);
  font-size: clamp(42px, 8vw, 76px);
  line-height: 1;
}
.fallback-caption {
  color: rgba(243, 239, 228, 0.36);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.2em;
}

.poster-shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(to top, rgba(5, 6, 9, 0.82), transparent 42%),
    linear-gradient(to bottom, rgba(5, 6, 9, 0.3), transparent 32%);
  pointer-events: none;
}

.duration {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 3;
  padding: 3px 7px;
  border: 1px solid rgba(243, 239, 228, 0.13);
  border-radius: 5px;
  color: var(--ink-soft);
  background: rgba(5, 6, 9, 0.72);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.03em;
  backdrop-filter: blur(10px);
}

.rank {
  position: absolute;
  top: 12px;
  left: 14px;
  z-index: 3;
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--amber-bright);
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 1;
  text-shadow: 0 3px 20px rgba(0, 0, 0, 0.5);
}
.rank small {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
  opacity: 0.7;
}

.status {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  padding: 4px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 99px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  backdrop-filter: blur(10px);
}
.status--green {
  color: var(--success);
  background: rgba(10, 24, 15, 0.72);
}
.status--amber {
  color: var(--amber);
  background: rgba(34, 24, 9, 0.76);
}
.status--red {
  color: #ffa99f;
  background: rgba(34, 12, 10, 0.76);
}
.status--muted {
  color: var(--muted);
  background: rgba(15, 17, 22, 0.76);
}

.hover-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.28);
  border-radius: 50%;
  color: #171208;
  background: var(--amber);
  opacity: 0;
  transform: translate(-50%, -42%) scale(0.9);
  transition: opacity 240ms ease, transform 320ms var(--ease-out);
}
.hover-play :deep(svg) {
  margin-left: 2px;
}
.video-card:hover .hover-play {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.watch-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  height: 3px;
  background: rgba(243, 239, 228, 0.14);
}
.watch-progress i {
  display: block;
  height: 100%;
  background: var(--amber);
}

.card-copy {
  display: grid;
  gap: 7px;
  padding: 0 2px;
}

.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.card-category {
  overflow: hidden;
  color: var(--amber);
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.82;
}

.card-title {
  overflow: hidden;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 13px;
  color: var(--muted);
  font-size: 10.5px;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.meta-item--uploader {
  overflow: hidden;
  max-width: 110px;
  margin-left: auto;
  text-overflow: ellipsis;
}

@media (max-width: 640px) {
  .card-title {
    font-size: 17px;
  }
  .meta-item--uploader {
    max-width: 80px;
  }
}
</style>
