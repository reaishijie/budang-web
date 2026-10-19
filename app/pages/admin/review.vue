<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Video, VideoStatus } from '~/types'
import { formatCount, formatDate, relativeTime, VIDEO_STATUS_LABEL, videoStatusTone } from '~/utils/format'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const videoApi = useVideoApi()
const toast = useToast()

const statusOptions: VideoStatus[] = ['PENDING', 'PUBLISHED', 'REJECTED', 'SUSPENDED', 'OFFLINE']
const statusLabels: Record<VideoStatus, string> = {
  PENDING: '待审核',
  PUBLISHED: '已发布',
  REJECTED: '已驳回',
  SUSPENDED: '已下架',
  OFFLINE: '已下线',
}

const initialStatus = statusOptions.includes(String(route.query.status) as VideoStatus)
  ? String(route.query.status) as VideoStatus
  : 'PENDING'

const status = ref<VideoStatus>(initialStatus)
const page = ref(1)
const keywordInput = ref('')
const keyword = ref('')
const actingId = ref<number | null>(null)

const { data, pending, error, refresh } = await useAsyncData(
  () => `admin-review-${status.value}-${keyword.value}-${page.value}`,
  () => videoApi.listReviewQueue({
    page: page.value,
    pageSize: 10,
    status: status.value,
    keyword: keyword.value || undefined,
  }),
  {
    watch: [status, keyword, page],
    default: () => ({ items: [] as Video[], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
  },
)

const videos = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

watch(() => route.query.status, (value) => {
  if (statusOptions.includes(String(value) as VideoStatus)) {
    status.value = String(value) as VideoStatus
    page.value = 1
  }
})

function setStatus(value: VideoStatus) {
  status.value = value
  page.value = 1
  keywordInput.value = ''
  keyword.value = ''
  void router.replace({ path: '/admin/review', query: { status: value } })
}

function search() {
  keyword.value = keywordInput.value.trim()
  page.value = 1
}

async function publish(video: Video) {
  if (actingId.value) return
  actingId.value = video.id
  try {
    await videoApi.updateVideoStatus(video.id, { status: 'PUBLISHED' })
    toast.success(`《${video.title}》已发布`)
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    actingId.value = null
  }
}

type OfflineStatus = 'SUSPENDED' | 'OFFLINE'

const offlineOpen = ref(false)
const offlineTarget = ref<Video | null>(null)
const offlineNext = ref<OfflineStatus>('OFFLINE')
const offlineSaving = ref(false)

const offlineCopy = computed(() => offlineNext.value === 'SUSPENDED'
  ? {
      title: '下架影片',
      description: 'SUSPEND VIDEO',
      action: '确认下架',
      warning: '下架后影片会从公开片库移除，作者将暂时不能编辑，直到管理员恢复发布。',
    }
  : {
      title: '下线影片',
      description: 'TAKE OFFLINE',
      action: '确认下线',
      warning: '下线后影片会从公开片库移除，但不会标记为违规下架，之后可以恢复发布。',
    })

function openOffline(video: Video, next: OfflineStatus) {
  if (actingId.value || offlineSaving.value) return
  offlineTarget.value = video
  offlineNext.value = next
  offlineOpen.value = true
}

async function confirmOffline() {
  if (!offlineTarget.value || offlineSaving.value) return
  offlineSaving.value = true
  actingId.value = offlineTarget.value.id
  try {
    await videoApi.updateVideoStatus(offlineTarget.value.id, { status: offlineNext.value })
    toast.success(offlineNext.value === 'SUSPENDED' ? '影片已下架' : '影片已下线')
    offlineOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    offlineSaving.value = false
    actingId.value = null
  }
}

const rejectOpen = ref(false)
const rejectTarget = ref<Video | null>(null)
const rejectReason = ref('')
const rejecting = ref(false)

function openReject(video: Video) {
  rejectTarget.value = video
  rejectReason.value = ''
  rejectOpen.value = true
}

async function submitReject() {
  if (!rejectTarget.value || rejecting.value) return
  if (!rejectReason.value.trim()) {
    toast.error('请填写驳回原因')
    return
  }
  rejecting.value = true
  try {
    await videoApi.updateVideoStatus(rejectTarget.value.id, {
      status: 'REJECTED',
      rejectReason: rejectReason.value.trim(),
    })
    toast.success('影片已驳回')
    rejectOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    rejecting.value = false
  }
}

useSeoMeta({ title: '影片审核', description: '审核、发布、下架补档影片。' })
</script>

<template>
  <div class="admin-page">
    <header class="admin-head">
      <div>
        <span class="eyebrow">MODERATION DESK · 影片审核</span>
        <h1>审核队列</h1>
        <p>每一支影片都需要一束光，也需要一次认真查看。</p>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" @click="refresh()">
        <AppIcon name="refresh" :size="13" />
        刷新队列
      </button>
    </header>

    <div class="review-toolbar">
      <div class="status-tabs">
        <button
          v-for="option in statusOptions"
          :key="option"
          type="button"
          class="status-tab"
          :class="{ 'is-active': status === option }"
          @click="setStatus(option)"
        >
          {{ statusLabels[option] }}
        </button>
      </div>
      <form class="review-search" role="search" @submit.prevent="search">
        <AppIcon name="search" :size="14" />
        <input v-model="keywordInput" type="search" placeholder="搜索片名或简介" aria-label="搜索待审核影片">
        <button type="submit">搜索</button>
      </form>
    </div>

    <div class="queue-meta">
      <span>{{ statusLabels[status] }} · {{ total }} 部影片</span>
      <span v-if="keyword">关键词：{{ keyword }}</span>
    </div>

    <div v-if="error" class="form-error">{{ error.message }}</div>

    <div v-if="pending" class="review-skeletons">
      <div v-for="index in 4" :key="index" class="skeleton" style="height: 104px; border-radius: 13px;" />
    </div>

    <div v-else-if="videos.length" class="review-list">
      <article v-for="video in videos" :key="video.id" class="review-item">
        <NuxtLink class="review-cover" :to="`/videos/${video.id}`">
          <img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" loading="lazy">
          <span v-else>{{ [...video.title][0] || '光' }}</span>
          <i class="review-cover-play"><AppIcon name="play" :size="15" /></i>
        </NuxtLink>

        <div class="review-copy">
          <div class="review-topline">
            <span class="badge" :class="`badge--${videoStatusTone(video.status)}`">{{ VIDEO_STATUS_LABEL[video.status] }}</span>
            <span v-if="video.duration <= 0" class="badge badge--red">时长缺失</span>
            <span v-if="video.category" class="review-category">{{ video.category.name }}</span>
            <span class="review-id">NO. {{ String(video.id).padStart(4, '0') }}</span>
          </div>
          <NuxtLink class="review-title" :to="`/videos/${video.id}`">{{ video.title }}</NuxtLink>
          <div class="review-meta">
            <span><AppIcon name="user" :size="11" />{{ video.uploader?.nickname || video.uploader?.username || '未知' }}</span>
            <span><AppIcon name="calendar" :size="11" />{{ formatDate(video.createdAt) }}</span>
            <span><AppIcon name="eye" :size="11" />{{ formatCount(video.counts.views) }}</span>
            <span><AppIcon name="thumbsUp" :size="11" />{{ formatCount(video.counts.likes) }}</span>
          </div>
          <p v-if="video.rejectReason" class="review-reason">驳回原因：{{ video.rejectReason }}</p>
        </div>

        <div class="review-actions">
          <NuxtLink class="btn btn-subtle btn-sm" :to="`/admin/videos/${video.id}/edit`">
            <AppIcon name="edit" :size="13" />
            编辑
          </NuxtLink>
          <template v-if="video.status === 'PENDING'">
            <button class="btn btn-primary btn-sm" type="button" :disabled="actingId === video.id" @click="publish(video)">
              <span v-if="actingId === video.id" class="spinner" />
              <AppIcon v-else name="check" :size="13" />
              通过
            </button>
            <button class="btn btn-danger btn-sm" type="button" :disabled="actingId === video.id" @click="openReject(video)">
              <AppIcon name="close" :size="13" />
              驳回
            </button>
          </template>
          <template v-else-if="video.status === 'PUBLISHED'">
            <button class="btn btn-ghost btn-sm" type="button" :disabled="actingId === video.id" @click="openOffline(video, 'OFFLINE')">
              下线
            </button>
            <button class="btn btn-danger btn-sm" type="button" :disabled="actingId === video.id" @click="openOffline(video, 'SUSPENDED')">
              下架
            </button>
          </template>
          <template v-else>
            <button class="btn btn-primary btn-sm" type="button" :disabled="actingId === video.id" @click="publish(video)">
              <AppIcon name="refresh" :size="13" />
              恢复发布
            </button>
          </template>
          <NuxtLink class="btn btn-subtle btn-sm" :to="`/videos/${video.id}`">
            预览
            <AppIcon name="external" :size="12" />
          </NuxtLink>
        </div>
      </article>
    </div>

    <EmptyState
      v-else
      icon="check"
      :title="`${statusLabels[status]}队列为空`"
      text="当前状态下没有需要处理的影片。切换其他状态查看，或等待新的提交。"
    />

    <PaginationBar
      v-if="(data?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="data?.totalPages ?? 1"
      @update:page="(value) => { page = value }"
    />

    <ModalDialog
      :open="rejectOpen"
      title="驳回影片"
      description="REJECTION NOTE"
      @close="rejectOpen = false"
    >
      <div class="reject-modal">
        <p>《{{ rejectTarget?.title }}》</p>
        <div class="field">
          <label class="field-label" for="reject-reason">驳回原因 <span class="required">*</span></label>
          <textarea
            id="reject-reason"
            v-model="rejectReason"
            class="textarea"
            rows="4"
            maxlength="500"
            placeholder="告诉作者需要修改什么，例如：封面不清晰、内容与标签不符…"
          />
        </div>
        <span class="field-hint">原因会显示在作者的「我的影片」页面，也会在详情页对作者和管理员可见。</span>
      </div>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="rejectOpen = false">取消</button>
        <button class="btn btn-danger btn-sm" type="button" :disabled="rejecting" @click="submitReject">
          <span v-if="rejecting" class="spinner" />
          <AppIcon v-else name="close" :size="13" />
          确认驳回
        </button>
      </template>
    </ModalDialog>

    <ModalDialog
      :open="offlineOpen"
      :title="offlineCopy.title"
      :description="offlineCopy.description"
      width="460px"
      @close="offlineOpen = false"
    >
      <div class="offline-modal">
        <p>《{{ offlineTarget?.title }}》</p>
        <div class="offline-warning">
          <AppIcon name="alert" :size="16" />
          <span>{{ offlineCopy.warning }}</span>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" :disabled="offlineSaving" @click="offlineOpen = false">取消</button>
        <button class="btn btn-danger btn-sm" type="button" :disabled="offlineSaving" @click="confirmOffline">
          <span v-if="offlineSaving" class="spinner" />
          <AppIcon v-else name="close" :size="13" />
          {{ offlineCopy.action }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 20px;
}
.admin-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}
.admin-head > div {
  display: grid;
  gap: 8px;
}
.admin-head h1 {
  font-family: var(--font-display);
  font-size: clamp(36px, 4.4vw, 54px);
  font-weight: 400;
  letter-spacing: -0.035em;
  line-height: 1;
}
.admin-head p {
  color: var(--muted);
  font-size: 11.5px;
}

.review-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}
.status-tabs {
  display: flex;
  overflow-x: auto;
  gap: 3px;
  scrollbar-width: none;
}
.status-tabs::-webkit-scrollbar {
  display: none;
}
.status-tab {
  flex: 0 0 auto;
  padding: 7px 11px;
  border-radius: 99px;
  color: var(--muted);
  background: transparent;
  font-size: 10px;
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
.review-search {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  width: 230px;
  padding: 4px 4px 4px 11px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: rgba(12, 14, 19, 0.55);
}
.review-search:focus-within {
  border-color: rgba(243, 184, 95, 0.35);
}
.review-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 10.5px;
}
.review-search button {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 99px;
  color: #171208;
  background: var(--amber);
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

.queue-meta {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.06em;
}

.review-list {
  display: grid;
  gap: 10px;
}
.review-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: rgba(15, 18, 24, 0.46);
  transition: border-color 160ms ease, background 160ms ease;
}
.review-item:hover {
  border-color: var(--line-strong);
  background: rgba(17, 20, 27, 0.65);
}
.review-cover {
  position: relative;
  display: grid;
  width: 124px;
  height: 70px;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--muted);
  background: var(--surface-2);
  font-family: var(--font-display);
  font-size: 25px;
}
.review-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.review-cover-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--amber-bright);
  background: rgba(5, 6, 9, 0.25);
  opacity: 0;
  transition: opacity 160ms ease;
}
.review-cover:hover .review-cover-play {
  opacity: 1;
}

.review-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}
.review-topline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.review-category {
  color: var(--muted);
  font-size: 9px;
}
.review-id {
  margin-left: auto;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.08em;
}
.review-title {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.review-title:hover {
  color: var(--amber-bright);
}
.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 11px;
  color: var(--muted-weak);
  font-size: 8.5px;
}
.review-meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.review-reason {
  overflow: hidden;
  color: #ffa49a;
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  max-width: 250px;
}
.review-actions .btn {
  min-height: 31px;
  padding: 0 10px;
  font-size: 9.5px;
}

.review-skeletons {
  display: grid;
  gap: 10px;
}

.reject-modal {
  display: grid;
  gap: 14px;
}


.offline-modal {
  display: grid;
  gap: 13px;
}
.offline-modal > p {
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 21px;
  line-height: 1.3;
}
.offline-warning {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, var(--danger) 22%, var(--line));
  border-radius: 9px;
  color: var(--muted);
  background: color-mix(in srgb, var(--danger) 6%, transparent);
  font-size: 10px;
  line-height: 1.7;
}
.offline-warning :deep(svg) {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--danger);
}

.reject-modal > p {
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 18px;
}
.required {
  color: var(--amber);
}

@media (max-width: 900px) {
  .review-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 11px;
  }
  .review-search {
    width: 100%;
  }
  .review-item {
    flex-wrap: wrap;
  }
  .review-copy {
    min-width: calc(100% - 145px);
  }
  .review-actions {
    width: 100%;
    max-width: none;
    justify-content: flex-start;
    padding-left: 139px;
  }
  .admin-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
}
@media (max-width: 560px) {
  .review-cover {
    width: 88px;
    height: 54px;
  }
  .review-copy {
    min-width: calc(100% - 105px);
  }
  .review-actions {
    padding-left: 0;
  }
  .review-title {
    font-size: 16px;
  }
}
</style>
