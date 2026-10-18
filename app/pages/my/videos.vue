<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Video, VideoStatus } from '~/types'
import { formatCount, formatDate, VIDEO_STATUS_LABEL, videoStatusTone } from '~/utils/format'
import { useToast } from '~/composables/useToast'

const auth = useAuth()
const videoApi = useVideoApi()
const toast = useToast()

const statusOptions: Array<{ value: VideoStatus | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'PENDING', label: '待审核' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'SUSPENDED', label: '已下架' },
  { value: 'OFFLINE', label: '已下线' },
]

const status = ref<VideoStatus | ''>('')
const page = ref(1)
const actingId = ref<number | null>(null)

const { data, pending, error, refresh } = await useAsyncData(
  () => `my-videos-${status.value || 'all'}-${page.value}`,
  () => videoApi.listMyVideos({ page: page.value, pageSize: 10, status: status.value || undefined }),
  {
    watch: [status, page],
    default: () => ({ items: [] as Video[], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
  },
)

const videos = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

const editOpen = ref(false)
const editingVideo = ref<Video | null>(null)
const editForm = reactive({ title: '', description: '' })
const saving = ref(false)

function changeStatus(value: VideoStatus | '') {
  status.value = value
  page.value = 1
}

function openEdit(video: Video) {
  editingVideo.value = video
  editForm.title = video.title
  editForm.description = video.description || ''
  editOpen.value = true
}

async function saveEdit() {
  if (!editingVideo.value || saving.value) return
  if (!editForm.title.trim()) {
    toast.error('影片标题不能为空')
    return
  }
  saving.value = true
  try {
    await videoApi.updateVideo(editingVideo.value.id, {
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
    })
    toast.success('影片信息已更新')
    editOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function resubmit(video: Video) {
  if (actingId.value) return
  actingId.value = video.id
  try {
    await videoApi.resubmitVideo(video.id)
    toast.success('影片已重新提交审核')
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '重新提交失败')
  } finally {
    actingId.value = null
  }
}

async function remove(video: Video) {
  if (!import.meta.client) return
  if (!window.confirm(`确定删除《${video.title}》吗？删除后无法恢复。`)) return
  if (actingId.value) return
  actingId.value = video.id
  try {
    await videoApi.deleteVideo(video.id)
    toast.success('影片已删除')
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    actingId.value = null
  }
}

useSeoMeta({
  title: '我的影片',
  description: '管理你提交的影片、审核状态与驳回原因。',
})
</script>

<template>
  <div class="page my-page">
    <div class="container">
      <header class="studio-head">
        <div>
          <span class="eyebrow">CREATOR DESK · 创作者桌面</span>
          <h1 class="studio-title">我的影片</h1>
          <p>查看审核进度，修改影片信息，或重新提交被驳回的影片。</p>
        </div>
        <div class="studio-actions">
          <NuxtLink v-if="auth.canUpload.value" class="btn btn-primary" to="/upload">
            <AppIcon name="plus" :size="15" />
            提交新影片
          </NuxtLink>
          <NuxtLink class="btn btn-ghost" to="/videos">浏览片库</NuxtLink>
        </div>
      </header>

      <div class="studio-toolbar">
        <div class="status-tabs">
          <button
            v-for="option in statusOptions"
            :key="option.value || 'all'"
            type="button"
            class="status-tab"
            :class="{ 'is-active': status === option.value }"
            @click="changeStatus(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <span class="studio-count">{{ total }} 支影片</span>
      </div>

      <div v-if="error" class="form-error">{{ error.message }}</div>

      <div v-if="pending" class="studio-skeletons">
        <div v-for="index in 3" :key="index" class="studio-skeleton">
          <div class="skeleton" style="width: 170px; aspect-ratio: 16/9; border-radius: 12px;" />
          <div class="studio-skeleton-copy">
            <div class="skeleton" style="width: 40%; height: 17px;" />
            <div class="skeleton" style="width: 65%; height: 11px;" />
          </div>
        </div>
      </div>

      <div v-else-if="videos.length" class="studio-list">
        <article v-for="video in videos" :key="video.id" class="studio-item">
          <NuxtLink class="studio-cover" :to="`/videos/${video.id}`">
            <img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" loading="lazy">
            <span v-else class="studio-cover-fallback">{{ [...video.title][0] || '光' }}</span>
            <span class="studio-cover-play"><AppIcon name="play" :size="16" /></span>
          </NuxtLink>

          <div class="studio-copy">
            <div class="studio-item-top">
              <span class="badge" :class="`badge--${videoStatusTone(video.status)}`">
                {{ VIDEO_STATUS_LABEL[video.status] }}
              </span>
              <span class="studio-date">{{ formatDate(video.createdAt) }}</span>
            </div>
            <NuxtLink class="studio-item-title" :to="`/videos/${video.id}`">{{ video.title }}</NuxtLink>
            <div class="studio-meta">
              <span><AppIcon name="eye" :size="12" /> {{ formatCount(video.counts.views) }}</span>
              <span><AppIcon name="thumbsUp" :size="12" /> {{ formatCount(video.counts.likes) }}</span>
              <span><AppIcon name="bookmark" :size="12" /> {{ formatCount(video.counts.favorites) }}</span>
              <span><AppIcon name="message" :size="12" /> {{ formatCount(video.counts.comments) }}</span>
            </div>
            <p v-if="video.status === 'REJECTED' && video.rejectReason" class="reject-reason">
              <AppIcon name="alert" :size="13" />
              驳回原因：{{ video.rejectReason }}
            </p>
          </div>

          <div class="studio-item-actions">
            <NuxtLink class="btn btn-subtle btn-sm" :to="`/videos/${video.id}`">
              <AppIcon name="eye" :size="13" />
              查看
            </NuxtLink>
            <button
              v-if="video.status !== 'SUSPENDED'"
              class="btn btn-subtle btn-sm"
              type="button"
              @click="openEdit(video)"
            >
              <AppIcon name="edit" :size="13" />
              编辑
            </button>
            <button
              v-if="video.status === 'REJECTED'"
              class="btn btn-primary btn-sm"
              type="button"
              :disabled="actingId === video.id"
              @click="resubmit(video)"
            >
              <span v-if="actingId === video.id" class="spinner" />
              <AppIcon v-else name="refresh" :size="13" />
              重新提交
            </button>
            <button
              class="btn btn-danger btn-sm"
              type="button"
              :disabled="actingId === video.id"
              @click="remove(video)"
            >
              <AppIcon name="trash" :size="13" />
              删除
            </button>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        icon="film"
        :title="status ? '这个状态下还没有影片' : '你的创作者桌面还是空的'"
        :text="status ? '切换到其他状态，或提交一支新影片。' : (auth.canUpload.value ? '上传第一支影片，让它进入补档的片库。' : '当前账户没有上传权限，可以先联系管理员开通。')"
      >
        <NuxtLink v-if="auth.canUpload.value" class="btn btn-primary btn-sm" to="/upload">提交影片</NuxtLink>
        <NuxtLink class="btn btn-ghost btn-sm" to="/videos">浏览片库</NuxtLink>
      </EmptyState>

      <PaginationBar
        v-if="(data?.totalPages ?? 0) > 1"
        :page="page"
        :total-pages="data?.totalPages ?? 1"
        @update:page="(value) => { page = value }"
      />
    </div>

    <ModalDialog
      :open="editOpen"
      title="编辑影片信息"
      description="METADATA"
      @close="editOpen = false"
    >
      <form class="edit-form" @submit.prevent="saveEdit">
        <div class="field">
          <label class="field-label" for="edit-title">标题</label>
          <input id="edit-title" v-model="editForm.title" class="input" maxlength="200" required>
        </div>
        <div class="field">
          <label class="field-label" for="edit-description">简介</label>
          <textarea id="edit-description" v-model="editForm.description" class="textarea" rows="6" maxlength="5000" />
        </div>
        <p class="field-hint">编辑已发布影片不会自动重新审核，请谨慎修改公开信息。</p>
      </form>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="editOpen = false">取消</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="saving" @click="saveEdit">
          <span v-if="saving" class="spinner" />
          <AppIcon v-else name="check" :size="14" />
          保存修改
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.my-page {
  padding-top: clamp(30px, 4vw, 54px);
}

.studio-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 27px;
  border-bottom: 1px solid var(--line);
}
.studio-head > div:first-child {
  display: grid;
  gap: 10px;
}
.studio-title {
  font-family: var(--font-display);
  font-size: clamp(42px, 5.5vw, 68px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
}
.studio-head p {
  color: var(--muted);
  font-size: 12px;
}
.studio-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.studio-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}
.status-tabs {
  display: flex;
  overflow-x: auto;
  gap: 4px;
  scrollbar-width: none;
}
.status-tabs::-webkit-scrollbar {
  display: none;
}
.status-tab {
  flex: 0 0 auto;
  padding: 7px 12px;
  border-radius: 99px;
  color: var(--muted);
  background: transparent;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: 150ms ease;
}
.status-tab:hover {
  color: var(--ink);
}
.status-tab.is-active {
  color: #171208;
  background: var(--amber);
}
.studio-count {
  flex: 0 0 auto;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.studio-list {
  display: grid;
  gap: 0;
}
.studio-item {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}
.studio-cover {
  position: relative;
  width: 172px;
  flex: 0 0 auto;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface-2);
}
.studio-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 400ms var(--ease-out);
}
.studio-cover:hover img {
  transform: scale(1.04);
}
.studio-cover-fallback {
  display: grid;
  height: 100%;
  place-items: center;
  color: var(--muted);
  background: linear-gradient(140deg, #20242c, #0b0d12);
  font-family: var(--font-display);
  font-size: 32px;
}
.studio-cover-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--amber);
  background: rgba(5, 6, 9, 0.25);
  opacity: 0;
  transition: opacity 180ms ease;
}
.studio-cover:hover .studio-cover-play {
  opacity: 1;
}

.studio-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 6px;
}
.studio-item-top {
  display: flex;
  align-items: center;
  gap: 9px;
}
.studio-date {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}
.studio-item-title {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.studio-item-title:hover {
  color: var(--amber-bright);
}
.studio-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--muted);
  font-size: 9px;
}
.studio-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.reject-reason {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #ff9f95;
  font-size: 10px;
}
.reject-reason :deep(svg) {
  flex: 0 0 auto;
}

.studio-item-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  max-width: 310px;
}
.studio-item-actions .btn {
  min-height: 31px;
  padding: 0 10px;
  font-size: 9.5px;
}

.studio-skeletons {
  display: grid;
  gap: 0;
}
.studio-skeleton {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}
.studio-skeleton-copy {
  display: grid;
  flex: 1;
  gap: 9px;
}

.edit-form {
  display: grid;
  gap: 15px;
}

@media (max-width: 900px) {
  .studio-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
  .studio-item {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .studio-copy {
    min-width: calc(100% - 200px);
  }
  .studio-item-actions {
    width: 100%;
    max-width: none;
    justify-content: flex-start;
    padding-left: 190px;
  }
}

@media (max-width: 620px) {
  .studio-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .studio-cover {
    width: 120px;
  }
  .studio-copy {
    min-width: calc(100% - 140px);
  }
  .studio-item-title {
    font-size: 18px;
  }
  .studio-item-actions {
    padding-left: 0;
  }
}
</style>
