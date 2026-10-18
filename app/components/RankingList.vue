<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Video } from '~/types'
import { formatCount } from '~/utils/format'

const props = defineProps<{
  videos: Video[]
}>()

const failedIds = ref<number[]>([])

const items = computed(() => props.videos.slice(0, 5))

function imageFailed(id: number) {
  failedIds.value = [...failedIds.value, id]
}
</script>

<template>
  <aside class="ranking">
    <header class="ranking-head">
      <div>
        <span class="section-kicker">TOP 05</span>
        <h3 class="ranking-title">本周热度</h3>
      </div>
      <span class="ranking-note">BY VIEWS</span>
    </header>

    <div class="ranking-list">
      <NuxtLink
        v-for="(video, index) in items"
        :key="video.id"
        class="rank-row"
        :to="`/videos/${video.id}`"
      >
        <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span>
        <span class="rank-thumb">
          <img
            v-if="video.coverUrl && !failedIds.includes(video.id)"
            :src="video.coverUrl"
            :alt="video.title"
            loading="lazy"
            @error="imageFailed(video.id)"
          >
          <span v-else class="rank-thumb-fallback">{{ [...video.title][0] || '光' }}</span>
        </span>
        <span class="rank-copy">
          <strong>{{ video.title }}</strong>
          <small>{{ video.category?.name || '未分类' }} · {{ formatCount(video.counts.views) }} 观看</small>
        </span>
        <AppIcon name="arrowRight" :size="13" class="rank-arrow" />
      </NuxtLink>
    </div>

    <NuxtLink class="ranking-more" to="/rankings">
      查看完整热度榜
      <AppIcon name="arrowRight" :size="13" />
    </NuxtLink>
  </aside>
</template>

<style scoped>
.ranking {
  display: grid;
  align-content: start;
  gap: 0;
  padding: 24px 22px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(160deg, rgba(243, 184, 95, 0.055), transparent 36%),
    rgba(15, 18, 24, 0.55);
  backdrop-filter: blur(16px);
}

.ranking-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}
.ranking-head > div {
  display: grid;
  gap: 5px;
}
.ranking-title {
  font-family: var(--font-display);
  font-size: 25px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.ranking-note {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.ranking-list {
  display: grid;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  transition: 170ms ease;
}
.rank-row:hover {
  padding-left: 5px;
}
.rank-row:hover .rank-arrow {
  opacity: 1;
  transform: translateX(0);
}

.rank-number {
  width: 22px;
  flex: 0 0 auto;
  color: var(--muted-weak);
  font-family: var(--font-display);
  font-size: 17px;
  line-height: 1;
}
.rank-row:first-child .rank-number {
  color: var(--amber);
}

.rank-thumb {
  width: 58px;
  height: 40px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-2);
}
.rank-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rank-thumb-fallback {
  display: grid;
  height: 100%;
  place-items: center;
  color: var(--muted);
  background: linear-gradient(140deg, #20242c, #0b0d12);
  font-family: var(--font-display);
  font-size: 19px;
}

.rank-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}
.rank-copy strong {
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-copy small {
  color: var(--muted-weak);
  font-size: 9px;
}

.rank-arrow {
  flex: 0 0 auto;
  color: var(--amber);
  opacity: 0;
  transform: translateX(-5px);
  transition: 180ms ease;
}

.ranking-more {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 17px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: color 160ms ease;
}
.ranking-more:hover {
  color: var(--amber-bright);
}
</style>
