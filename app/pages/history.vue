<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HistoryItem } from '~/types'
import { formatDuration, progressPercent, relativeTime } from '~/utils/format'
import { useToast } from '~/composables/useToast'

const videoApi = useVideoApi()
const toast = useToast()

const page = ref(1)
const actingId = ref<number | null>(null)
const clearing = ref(false)

const { data, pending, error, refresh } = await useAsyncData(
  () => `history-${page.value}`,
  () => videoApi.listHistory(page.value, 12),
  {
    watch: [page],
    default: () => ({ items: [] as HistoryItem[], total: 0, page: 1, pageSize: 12, totalPages: 0 }),
  },
)

const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

async function remove(item: HistoryItem) {
  if (actingId.value) return
  actingId.value = item.video.id
  try {
    await videoApi.removeHistory(item.video.id)
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    else await refresh()
    toast.success('已从观看历史中移除')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    actingId.value = null
  }
}

async function clearAll() {
  if (!import.meta.client || clearing.value) return
  if (!window.confirm('确定清空全部观看历史吗？')) return
  clearing.value = true
  try {
    await videoApi.clearHistory()
    page.value = 1
    await refresh()
    toast.success('观看历史已清空')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '清空失败')
  } finally {
    clearing.value = false
  }
}

useSeoMeta({
  title: '观看历史',
  description: '你最近在光影看过的影片。',
})
</script>

<template>
  <div class="page history-page">
    <div class="container">
      <header class="history-head">
        <div>
          <span class="eyebrow">RECENT SCREENINGS · 观看历史</span>
          <h1 class="history-title">光走过的痕迹</h1>
          <p>接着上次停下的那一帧，继续看下去。</p>
        </div>
        <div class="history-actions">
          <span class="history-count">{{ total }} 条记录</span>
          <button v-if="items.length" class="btn btn-ghost btn-sm" type="button" :disabled="clearing" @click="clearAll">
            <AppIcon name="trash" :size="13" />
            清空历史
          </button>
        </div>
      </header>

      <div v-if="error" class="form-error">{{ error.message }}</div>

      <div v-if="pending" class="history-skeletons">
        <div v-for="index in 4" :key="index" class="skeleton" style="height: 112px; border-radius: 14px;" />
      </div>

      <div v-else-if="items.length" class="history-list">
        <article v-for="item in items" :key="item.id" class="history-item">
          <NuxtLink class="history-cover" :to="`/videos/${item.video.id}`">
            <img v-if="item.video.coverUrl" :src="item.video.coverUrl" :alt="item.video.title" loading="lazy">
            <span v-else class="history-cover-fallback">{{ [...item.video.title][0] || '光' }}</span>
            <span class="history-play"><AppIcon name="play" :size="15" /></span>
          </NuxtLink>

          <div class="history-copy">
            <NuxtLink class="history-item-title" :to="`/videos/${item.video.id}`">{{ item.video.title }}</NuxtLink>
            <div class="history-meta">
              <span>{{ item.video.category?.name || '未分类' }}</span>
              <span>{{ formatDuration(item.video.duration) }}</span>
              <span>{{ relativeTime(item.lastWatchedAt) }}观看</span>
            </div>
            <div class="history-progress">
              <div class="progress-label">
                <span>{{ item.completed ? '已看完' : '继续观看' }}</span>
                <span>{{ Math.round(progressPercent(item.progressSeconds, item.durationSeconds)) }}%</span>
              </div>
              <div class="progress-track"><i :style="{ width: `${progressPercent(item.progressSeconds, item.durationSeconds)}%` }" /></div>
            </div>
          </div>

          <div class="history-item-actions">
            <NuxtLink class="btn btn-primary btn-sm" :to="`/videos/${item.video.id}`">
              <AppIcon name="play" :size="13" />
              {{ item.completed ? '重温' : '继续' }}
            </NuxtLink>
            <button class="btn btn-subtle btn-sm" type="button" :disabled="actingId === item.video.id" @click="remove(item)">
              <AppIcon name="close" :size="13" />
              移除
            </button>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        icon="clock"
        title="还没有留下观看痕迹"
        text="当你在光影开始播放一支影片，这里会记住你停下的位置。"
      >
        <NuxtLink class="btn btn-primary btn-sm" to="/videos">去片库看看</NuxtLink>
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
.history-page {
  padding-top: clamp(30px, 4vw, 54px);
}
.history-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--line);
}
.history-head > div:first-child {
  display: grid;
  gap: 11px;
}
.history-title {
  font-family: var(--font-display);
  font-size: clamp(42px, 5.5vw, 68px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
}
.history-head p {
  color: var(--muted);
  font-size: 12px;
}
.history-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
}
.history-count {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
}

.history-list {
  display: grid;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 0;
  border-bottom: 1px solid var(--line);
}
.history-cover {
  position: relative;
  width: 170px;
  flex: 0 0 auto;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
}
.history-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.history-cover-fallback {
  display: grid;
  height: 100%;
  place-items: center;
  color: var(--muted);
  background: linear-gradient(140deg, #20242c, #0b0d12);
  font-family: var(--font-display);
  font-size: 32px;
}
.history-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--amber-bright);
  background: rgba(5, 6, 9, 0.24);
  opacity: 0;
  transition: opacity 180ms ease;
}
.history-cover:hover .history-play {
  opacity: 1;
}

.history-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 7px;
}
.history-item-title {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 500;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-item-title:hover {
  color: var(--amber-bright);
}
.history-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
}
.history-progress {
  display: grid;
  max-width: 440px;
  gap: 5px;
  margin-top: 3px;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  color: var(--muted-weak);
  font-size: 8.5px;
}
.progress-track {
  height: 3px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--surface-3);
}
.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--amber);
}
.history-item-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
}

.history-skeletons {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 900px) {
  .history-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
  .history-item {
    flex-wrap: wrap;
  }
  .history-copy {
    min-width: calc(100% - 200px);
  }
  .history-item-actions {
    width: 100%;
    padding-left: 188px;
  }
}
@media (max-width: 620px) {
  .history-cover {
    width: 112px;
  }
  .history-copy {
    min-width: calc(100% - 136px);
  }
  .history-item-title {
    font-size: 18px;
  }
  .history-item-actions {
    padding-left: 0;
  }
  .history-progress {
    display: none;
  }
}
</style>
