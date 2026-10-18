<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FavoriteItem } from '~/types'
import { useToast } from '~/composables/useToast'

const videoApi = useVideoApi()
const toast = useToast()

const page = ref(1)
const removingId = ref<number | null>(null)

const { data, pending, error, refresh } = await useAsyncData(
  () => `favorites-${page.value}`,
  () => videoApi.listFavorites(page.value, 12),
  {
    watch: [page],
    default: () => ({ items: [] as FavoriteItem[], total: 0, page: 1, pageSize: 12, totalPages: 0 }),
  },
)

const favorites = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

async function remove(item: FavoriteItem) {
  if (removingId.value) return
  removingId.value = item.video.id
  try {
    await videoApi.favoriteVideo(item.video.id, false)
    toast.success('已从收藏中移除')
    if (favorites.value.length === 1 && page.value > 1) page.value -= 1
    else await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    removingId.value = null
  }
}

useSeoMeta({
  title: '我的收藏',
  description: '你在补档收藏的影片。',
})
</script>

<template>
  <div class="page collection-page">
    <div class="container">
      <header class="collection-head">
        <div>
          <span class="eyebrow">YOUR PRIVATE SCREENINGS · 我的收藏</span>
          <h1 class="collection-title">留在手边的<br>那些光。</h1>
          <p>收藏的影片会安静地待在这里，等你再次打开。</p>
        </div>
        <div class="collection-count">
          <strong>{{ total }}</strong>
          <span>部收藏</span>
        </div>
      </header>

      <div v-if="error" class="form-error">{{ error.message }}</div>

      <div v-if="pending" class="skeleton-grid">
        <div v-for="index in 8" :key="index" class="skeleton" style="aspect-ratio: 16/9; border-radius: 16px;" />
      </div>

      <div v-else-if="favorites.length" class="favorite-grid">
        <div v-for="item in favorites" :key="item.favoriteId" class="favorite-item">
          <VideoCard :video="item.video" />
          <button
            class="favorite-remove"
            type="button"
            :disabled="removingId === item.video.id"
            aria-label="取消收藏"
            @click="remove(item)"
          >
            <AppIcon name="bookmarkFilled" :size="14" />
            取消收藏
          </button>
        </div>
      </div>

      <EmptyState
        v-else
        icon="bookmark"
        title="收藏夹还没有星光"
        text="在影片详情页点击收藏，把喜欢的影片留在这里。"
      >
        <NuxtLink class="btn btn-primary btn-sm" to="/videos">去片库逛逛</NuxtLink>
      </EmptyState>

      <PaginationBar
        v-if="(data?.totalPages ?? 0) > 1"
        :page="page"
        :total-pages="data?.totalPages ?? 1"
        @update:page="(value) => { page = value }"
      />
    </div>
  </div>
</template>

<style scoped>
.collection-page {
  padding-top: clamp(30px, 4vw, 54px);
}

.collection-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--line);
}
.collection-head > div:first-child {
  display: grid;
  gap: 12px;
}
.collection-title {
  font-family: var(--font-display);
  font-size: clamp(44px, 6vw, 72px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 0.98;
}
.collection-head p {
  color: var(--muted);
  font-size: 12px;
}
.collection-count {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 1px;
}
.collection-count strong {
  color: var(--amber);
  font-family: var(--font-display);
  font-size: 58px;
  font-weight: 400;
  line-height: 1;
}
.collection-count span {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.favorite-grid,
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(26px, 3vw, 38px) clamp(18px, 2.2vw, 28px);
  margin-top: 30px;
}

.favorite-item {
  position: relative;
  min-width: 0;
}
.favorite-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid rgba(243, 239, 228, 0.16);
  border-radius: 99px;
  color: var(--amber-bright);
  background: rgba(5, 6, 9, 0.72);
  font-size: 8.5px;
  opacity: 0;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: opacity 160ms ease, background 160ms ease;
}
.favorite-item:hover .favorite-remove,
.favorite-remove:focus-visible {
  opacity: 1;
}
.favorite-remove:hover {
  background: rgba(30, 20, 8, 0.9);
}

@media (max-width: 1120px) {
  .favorite-grid,
  .skeleton-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 820px) {
  .favorite-grid,
  .skeleton-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .collection-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }
  .collection-count {
    justify-items: start;
    flex-direction: row;
    align-items: baseline;
    gap: 7px;
  }
  .collection-count strong {
    font-size: 38px;
  }
  .favorite-grid,
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
  .favorite-remove {
    opacity: 1;
  }
}
</style>
