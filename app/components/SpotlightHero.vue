<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Video } from '~/types'
import { formatCount, formatDuration } from '~/utils/format'

const props = defineProps<{
  video: Video
}>()

const imageFailed = ref(false)
const cover = computed(() => props.video.coverUrl && !imageFailed.value ? props.video.coverUrl : '')
const fallbackHue = computed(() => {
  let hash = 0
  for (const char of props.video.title) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
})
</script>

<template>
  <section class="spotlight" aria-labelledby="spotlight-title">
    <div class="spotlight-glow" aria-hidden="true" />

    <div class="spotlight-copy">
      <div class="spotlight-eyebrow">
        <span class="dot" />
        <span>NIGHT SCREENING · 本周精选</span>
      </div>

      <h1 id="spotlight-title" class="spotlight-title">{{ video.title }}</h1>

      <p v-if="video.description" class="spotlight-description">
        {{ video.description }}
      </p>

      <div class="spotlight-meta">
        <span v-if="video.category" class="meta-chip">{{ video.category.name }}</span>
        <span v-if="video.publishedAt" class="meta-text">{{ new Date(video.publishedAt).getFullYear() }}</span>
        <span v-if="video.duration" class="meta-text">{{ formatDuration(video.duration) }}</span>
        <span class="meta-text">{{ formatCount(video.counts.views) }} 次观看</span>
      </div>

      <div class="spotlight-actions">
        <NuxtLink class="btn btn-primary btn-lg" :to="`/videos/${video.id}`">
          <AppIcon name="play" :size="16" />
          立即放映
        </NuxtLink>
        <NuxtLink class="btn btn-ghost btn-lg" to="/videos">
          浏览片库
          <AppIcon name="arrowRight" :size="15" />
        </NuxtLink>
      </div>

      <div class="spotlight-footer">
        <div class="creator-line">
          <UserAvatar
            v-if="video.uploader"
            :name="video.uploader.nickname"
            :username="video.uploader.username"
            :avatar="video.uploader.avatar"
            :size="31"
          />
          <span>
            <small>放映者</small>
            <strong>{{ video.uploader?.nickname || video.uploader?.username || '光影放映室' }}</strong>
          </span>
        </div>
        <div class="hero-stats">
          <span><b>{{ formatCount(video.counts.likes) }}</b> 喜欢</span>
          <span><b>{{ formatCount(video.counts.favorites) }}</b> 收藏</span>
          <span><b>{{ formatCount(video.counts.comments) }}</b> 评论</span>
        </div>
      </div>
    </div>

    <NuxtLink class="spotlight-poster" :to="`/videos/${video.id}`" :aria-label="`观看 ${video.title}`">
      <span class="poster-index">01</span>
      <span class="poster-label">FEATURED FILM</span>

      <img
        v-if="cover"
        :src="cover"
        :alt="video.title"
        @error="imageFailed = true"
      >
      <div
        v-else
        class="poster-placeholder"
        :style="{ '--fallback-hue': fallbackHue }"
      >
        <span>{{ [...video.title][0] || '光' }}</span>
      </div>

      <div class="poster-veil" aria-hidden="true" />
      <div class="poster-play">
        <AppIcon name="play" :size="21" />
      </div>
      <div class="poster-bottom">
        <span class="poster-category">{{ video.category?.name || '独立影像' }}</span>
        <span class="poster-duration">{{ formatDuration(video.duration) }}</span>
      </div>
      <div class="poster-corner" aria-hidden="true" />
    </NuxtLink>
  </section>
</template>

<style scoped>
.spotlight {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(360px, 0.8fr);
  align-items: center;
  gap: clamp(34px, 6vw, 86px);
  min-height: min(76vh, 720px);
  padding: clamp(30px, 4vw, 44px) 0 clamp(40px, 5vw, 66px);
}

.spotlight-glow {
  position: absolute;
  top: -12%;
  right: 6%;
  width: 56vw;
  height: 56vw;
  max-width: 760px;
  max-height: 760px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(243, 184, 95, 0.13), transparent 66%);
  filter: blur(16px);
  pointer-events: none;
}

.spotlight-copy {
  position: relative;
  z-index: 2;
  display: grid;
  justify-items: start;
  gap: 0;
  animation: rise 900ms var(--ease-out) both;
}

.spotlight-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
}
.spotlight-eyebrow .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 14px var(--amber);
  animation: pulse 2.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}

.spotlight-title {
  max-width: 10em;
  font-family: var(--font-display);
  font-size: clamp(50px, 7vw, 98px);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 0.95;
  text-wrap: balance;
}

.spotlight-description {
  display: -webkit-box;
  overflow: hidden;
  max-width: 32em;
  margin-top: 24px;
  color: var(--ink-soft);
  font-size: clamp(13px, 1.2vw, 15px);
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.spotlight-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 23px;
}
.meta-chip {
  padding: 4px 10px;
  border: 1px solid rgba(243, 184, 95, 0.26);
  border-radius: 99px;
  color: var(--amber);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.meta-text {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
}

.spotlight-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 32px;
}

.spotlight-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  width: 100%;
  margin-top: 46px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.creator-line {
  display: flex;
  align-items: center;
  gap: 11px;
}
.creator-line span {
  display: grid;
  gap: 2px;
}
.creator-line small {
  color: var(--muted-weak);
  font-size: 9px;
  letter-spacing: 0.12em;
}
.creator-line strong {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.hero-stats {
  display: flex;
  gap: 18px;
  color: var(--muted);
  font-size: 9.5px;
  letter-spacing: 0.05em;
}
.hero-stats b {
  margin-right: 3px;
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 500;
}

.spotlight-poster {
  position: relative;
  z-index: 2;
  justify-self: end;
  width: min(100%, 440px);
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: 1px solid rgba(243, 239, 228, 0.18);
  border-radius: var(--radius-xl);
  background: var(--surface-2);
  box-shadow: var(--shadow-poster);
  isolation: isolate;
  transform: rotate(1.1deg);
  transition: transform 500ms var(--ease-out), box-shadow 500ms ease;
  animation: rise 1000ms 80ms var(--ease-out) both;
}
.spotlight-poster:hover {
  transform: rotate(0deg) translateY(-6px);
  box-shadow: 0 40px 110px rgba(0, 0, 0, 0.65);
}
.spotlight-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 900ms var(--ease-out);
}
.spotlight-poster:hover img {
  transform: scale(1.04);
}

.poster-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background:
    radial-gradient(circle at 70% 20%, hsl(var(--fallback-hue) 52% 48% / 0.65), transparent 45%),
    radial-gradient(circle at 20% 80%, rgba(243, 184, 95, 0.28), transparent 50%),
    linear-gradient(150deg, hsl(var(--fallback-hue) 32% 22%), #090a0e 75%);
}
.poster-placeholder span {
  color: rgba(243, 239, 228, 0.8);
  font-family: var(--font-display);
  font-size: 120px;
}

.poster-veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(to top, rgba(5, 6, 9, 0.82), transparent 42%),
    linear-gradient(to bottom, rgba(5, 6, 9, 0.28), transparent 24%);
}

.poster-index {
  position: absolute;
  top: 20px;
  left: 22px;
  z-index: 2;
  color: var(--amber-bright);
  font-family: var(--font-display);
  font-size: 34px;
  line-height: 1;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.55);
}
.poster-label {
  position: absolute;
  top: 25px;
  right: 22px;
  z-index: 2;
  color: rgba(243, 239, 228, 0.55);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.18em;
}

.poster-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.38);
  border-radius: 50%;
  color: #171208;
  background: rgba(243, 184, 95, 0.94);
  box-shadow: 0 0 0 10px rgba(243, 184, 95, 0.1);
  transform: translate(-50%, -50%);
  transition: transform 300ms var(--ease-out), box-shadow 300ms ease;
}
.poster-play :deep(svg) {
  margin-left: 3px;
}
.spotlight-poster:hover .poster-play {
  transform: translate(-50%, -50%) scale(1.08);
  box-shadow: 0 0 0 16px rgba(243, 184, 95, 0.08);
}

.poster-bottom {
  position: absolute;
  right: 22px;
  bottom: 20px;
  left: 22px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(243, 239, 228, 0.8);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
}
.poster-category {
  color: var(--amber-bright);
}

.poster-corner {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border-right: 1px solid rgba(243, 239, 228, 0.32);
  border-bottom: 1px solid rgba(243, 239, 228, 0.32);
  border-bottom-right-radius: 8px;
}

@media (max-width: 1040px) {
  .spotlight {
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.72fr);
    gap: 40px;
  }
  .spotlight-title {
    font-size: clamp(48px, 7.4vw, 76px);
  }
}

@media (max-width: 820px) {
  .spotlight {
    grid-template-columns: 1fr;
    gap: 36px;
    min-height: auto;
    padding-top: 18px;
  }
  .spotlight-poster {
    order: -1;
    justify-self: stretch;
    width: 100%;
    aspect-ratio: 16 / 10;
    transform: none;
  }
  .spotlight-title {
    max-width: none;
    font-size: clamp(44px, 10vw, 72px);
  }
  .spotlight-footer {
    margin-top: 30px;
  }
}

@media (max-width: 560px) {
  .spotlight-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
  .hero-stats {
    gap: 14px;
  }
  .spotlight-actions .btn {
    flex: 1;
  }
}
</style>
