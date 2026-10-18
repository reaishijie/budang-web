<script setup lang="ts">
import type { Video } from '~/types'

withDefaults(defineProps<{
  videos: Video[]
  loading?: boolean
  skeletonCount?: number
  showStatus?: boolean
}>(), {
  loading: false,
  skeletonCount: 8,
  showStatus: false,
})
</script>

<template>
  <div class="video-grid">
    <template v-if="loading">
      <div v-for="index in skeletonCount" :key="index" class="skeleton-card">
        <div class="skeleton skeleton-card__poster" />
        <div class="skeleton skeleton-card__line" />
        <div class="skeleton skeleton-card__line skeleton-card__line--short" />
      </div>
    </template>
    <VideoCard
      v-for="video in videos"
      v-else
      :key="video.id"
      :video="video"
      :show-status="showStatus"
    />
  </div>
</template>

<style scoped>
.video-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(26px, 3vw, 38px) clamp(18px, 2.2vw, 28px);
}

.skeleton-card {
  display: grid;
  gap: 12px;
}
.skeleton-card__poster {
  aspect-ratio: 16 / 9;
  border-radius: var(--radius);
}
.skeleton-card__line {
  width: 80%;
  height: 14px;
  border-radius: 5px;
}
.skeleton-card__line--short {
  width: 45%;
  height: 10px;
}

@media (max-width: 1120px) {
  .video-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 820px) {
  .video-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .video-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
</style>
