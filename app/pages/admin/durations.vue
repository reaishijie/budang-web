<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Video } from '~/types'
import { formatCount, formatDate, VIDEO_STATUS_LABEL, videoStatusTone } from '~/utils/format'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })

const videoApi = useVideoApi()
const toast = useToast()
const page = ref(1)
const savingId = ref<number | null>(null)
const drafts = reactive<Record<number, string>>({})

const { data, pending, error, refresh } = await useAsyncData(
  () => `admin-missing-durations-${page.value}`,
  () => videoApi.listMissingDurations(page.value, 20),
  {
    watch: [page],
    default: () => ({ items: [] as Video[], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
  },
)

const videos = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

watch(videos, (items) => {
  for (const video of items) {
    if (drafts[video.id] === undefined) drafts[video.id] = ''
  }
}, { immediate: true })

async function saveDuration(video: Video) {
  if (savingId.value) return
  const duration = Math.round(Number(drafts[video.id]))
  if (!Number.isFinite(duration) || duration <= 0) {
    toast.error('请输入大于 0 的秒数')
    return
  }
  savingId.value = video.id
  try {
    await videoApi.updateVideo(video.id, { duration })
    toast.success(`《${video.title}》时长已校准为 ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`)
    delete drafts[video.id]
    await refresh()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : '时长保存失败')
  } finally {
    savingId.value = null
  }
}

useSeoMeta({ title: '时长校准', description: '校准无法自动读取时长的影片。' })
</script>

<template>
  <div class="admin-page duration-page">
    <header class="admin-head">
      <div>
        <span class="eyebrow">DURATION CALIBRATION · 时长校准</span>
        <h1>校准片长</h1>
        <p>投稿时会自动读取时长；只有读取失败的影片会进入这里，请管理员补填真实秒数。</p>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" @click="refresh()">
        <AppIcon name="refresh" :size="13" />
        刷新列表
      </button>
    </header>

    <div class="duration-note panel">
      <AppIcon name="info" :size="16" />
      <div>
        <strong>为什么需要校准？</strong>
        <span>外部视频地址或部分浏览器可能无法读取 metadata。时长会影响详情页展示、弹幕时间校验、观看历史与完播判断。播放器本身始终按视频真实时长播放。</span>
      </div>
      <span class="duration-total">{{ total }} 部待校准</span>
    </div>

    <div v-if="error" class="form-error">{{ error.message }}</div>

    <div v-if="pending" class="duration-skeletons">
      <div v-for="index in 4" :key="index" class="skeleton" style="height: 100px; border-radius: 13px;" />
    </div>

    <div v-else-if="videos.length" class="duration-list">
      <article v-for="video in videos" :key="video.id" class="duration-item">
        <NuxtLink class="duration-cover" :to="`/videos/${video.id}`">
          <img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" loading="lazy">
          <span v-else>{{ [...video.title][0] || '光' }}</span>
        </NuxtLink>

        <div class="duration-copy">
          <div class="duration-topline">
            <span class="badge" :class="`badge--${videoStatusTone(video.status)}`">{{ VIDEO_STATUS_LABEL[video.status] }}</span>
            <span class="duration-missing"><AppIcon name="clock" :size="11" />时长缺失</span>
            <span class="duration-id">NO. {{ String(video.id).padStart(4, '0') }}</span>
          </div>
          <NuxtLink class="duration-title" :to="`/videos/${video.id}`">{{ video.title }}</NuxtLink>
          <div class="duration-meta">
            <span><AppIcon name="user" :size="11" />{{ video.uploader?.nickname || video.uploader?.username || '未知' }}</span>
            <span><AppIcon name="calendar" :size="11" />{{ formatDate(video.createdAt) }}</span>
            <span><AppIcon name="eye" :size="11" />{{ formatCount(video.counts.views) }}</span>
          </div>
        </div>

        <div class="duration-actions">
          <label class="duration-input-label" :for="`duration-${video.id}`">真实时长（秒）</label>
          <div class="duration-input-row">
            <input
              :id="`duration-${video.id}`"
              v-model="drafts[video.id]"
              class="input"
              type="number"
              min="1"
              max="86400"
              inputmode="numeric"
              placeholder="例如 133"
              @keydown.enter.prevent="saveDuration(video)"
            >
            <span>秒</span>
            <button class="btn btn-primary btn-sm" type="button" :disabled="savingId === video.id" @click="saveDuration(video)">
              <span v-if="savingId === video.id" class="spinner" />
              <AppIcon v-else name="check" :size="13" />
              保存
            </button>
          </div>
          <NuxtLink class="duration-edit-link" :to="`/admin/videos/${video.id}/edit`">
            完整编辑
            <AppIcon name="arrowRight" :size="12" />
          </NuxtLink>
        </div>
      </article>
    </div>

    <EmptyState
      v-else
      icon="check"
      title="所有影片时长都已校准"
      text="当前没有缺失时长的影片。投稿时自动读取成功的影片不会出现在这里。"
    />

    <PaginationBar
      v-if="(data?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="data?.totalPages ?? 1"
      @update:page="(value) => { page = value }"
    />
  </div>
</template>

<style scoped>
.duration-page {
  display: grid;
  gap: 20px;
}
.duration-note {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 14px 16px;
}
.duration-note :deep(svg) {
  color: var(--amber);
  flex: 0 0 auto;
  margin-top: 2px;
}
.duration-note > div {
  display: grid;
  flex: 1;
  gap: 4px;
}
.duration-note strong {
  color: var(--ink-soft);
  font-size: 11px;
}
.duration-note span {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.65;
}
.duration-note .duration-total {
  flex: 0 0 auto;
  color: var(--amber-bright);
  font-family: var(--font-mono);
  font-size: 8.5px;
  white-space: nowrap;
}
.duration-skeletons,
.duration-list {
  display: grid;
  gap: 9px;
}
.duration-item {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) 310px;
  align-items: center;
  gap: 16px;
  padding: 12px 15px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.025);
}
.duration-cover {
  display: grid;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--muted);
  background: var(--surface-2);
  font-family: var(--font-display);
  font-size: 24px;
}
.duration-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.duration-copy {
  display: grid;
  min-width: 0;
  gap: 6px;
}
.duration-topline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.duration-missing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--danger);
  font-family: var(--font-mono);
  font-size: 8px;
}
.duration-id {
  margin-left: auto;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
}
.duration-title {
  overflow: hidden;
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.duration-title:hover {
  color: var(--amber-bright);
}
.duration-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 11px;
  color: var(--muted-weak);
  font-size: 8px;
}
.duration-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.duration-actions {
  display: grid;
  gap: 5px;
}
.duration-input-label {
  color: var(--muted);
  font-size: 8.5px;
}
.duration-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.duration-input-row .input {
  min-width: 0;
  flex: 1;
}
.duration-input-row > span {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
}
.duration-input-row .btn {
  flex: 0 0 auto;
}
.duration-edit-link {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
}
.duration-edit-link:hover {
  color: var(--amber-bright);
}
@media (max-width: 1080px) {
  .duration-item {
    grid-template-columns: 120px minmax(0, 1fr) 260px;
    gap: 12px;
  }
}
@media (max-width: 820px) {
  .duration-item {
    grid-template-columns: 100px minmax(0, 1fr);
    align-items: start;
  }
  .duration-actions {
    grid-column: 2;
  }
  .duration-note {
    flex-wrap: wrap;
  }
  .duration-note .duration-total {
    margin-left: 27px;
  }
}
@media (max-width: 520px) {
  .duration-item {
    grid-template-columns: 74px minmax(0, 1fr);
    padding: 10px;
  }
  .duration-title {
    font-size: 16px;
  }
  .duration-actions {
    grid-column: 1 / -1;
  }
  .duration-id {
    display: none;
  }
}
</style>
