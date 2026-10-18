<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ApiRequestError } from '~/composables/useApi'
import type { VideoDetail } from '~/types'
import {
  formatBytes,
  formatCount,
  formatDate,
  formatDuration,
  VIDEO_STATUS_LABEL,
  videoStatusTone,
} from '~/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { user, isAdmin } = auth
const videoApi = useVideoApi()
const toast = useToast()
const siteSettings = useSiteSettings()

const videoId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) && id > 0 ? id : 0
})

const { data: video, error, refresh } = await useAsyncData(
  () => `video-detail-${videoId.value}`,
  async () => {
    try {
      return await videoApi.getVideo(videoId.value)
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 404) return null
      throw cause
    }
  },
  { watch: [videoId] },
)

if (error.value || !video.value) {
  const statusCode = (error.value as ApiRequestError | undefined)?.status ?? 404
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? '影片不存在或尚未发布' : '暂时无法加载影片',
  })
}

const { data: related } = await useAsyncData(
  () => `video-related-${videoId.value}`,
  () => videoApi.listVideos({ page: 1, pageSize: 8, sort: 'latest' }),
  { watch: [videoId] },
)

const relatedVideos = computed(() => (related.value?.items ?? [])
  .filter(item => item.id !== videoId.value)
  .slice(0, 6))

const busyVote = ref(false)
const busyFavorite = ref(false)
const viewRecorded = ref(false)
const lastProgressAt = ref(0)
const lastProgress = ref(0)
const lastDuration = ref(0)

const statusTone = computed(() => videoStatusTone(video.value?.status ?? 'PENDING'))
const isOwner = computed(() => Boolean(user.value && video.value && user.value.id === video.value.uploaderId))
const canSeeModeration = computed(() => isAdmin.value || isOwner.value)

useSeoMeta({
  title: () => video.value?.title ?? '影片',
  description: () => video.value?.description || siteSettings.value.description,
  ogTitle: () => video.value?.title ?? '影片',
  ogDescription: () => video.value?.description || siteSettings.value.description,
  ogImage: () => video.value?.coverUrl || undefined,
  ogType: 'video.other',
})

useHead(() => ({
  script: video.value
    ? [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: video.value.title,
          description: video.value.description || siteSettings.value.description,
          thumbnailUrl: video.value.coverUrl || undefined,
          uploadDate: video.value.publishedAt || video.value.createdAt,
          duration: video.value.duration ? `PT${video.value.duration}S` : undefined,
          author: video.value.uploader
            ? { '@type': 'Person', name: video.value.uploader.nickname || video.value.uploader.username }
            : undefined,
        }).replace(/</g, '\\u003c'),
      }]
    : [],
}))

function requireLogin(action: string): boolean {
  if (user.value) return true
  toast.info(`登录后即可${action}`)
  void router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}

async function vote(value: 'LIKE' | 'DISLIKE') {
  if (!requireLogin('参与点赞') || !video.value || busyVote.value) return
  busyVote.value = true
  const next = video.value.viewer.vote === value ? null : value
  try {
    const result = await videoApi.voteVideo(video.value.id, next)
    video.value.counts.likes = result.likeCount
    video.value.counts.dislikes = result.dislikeCount
    video.value.viewer.vote = result.userVote
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : '操作失败')
  } finally {
    busyVote.value = false
  }
}

async function toggleFavorite() {
  if (!requireLogin('收藏影片') || !video.value || busyFavorite.value) return
  busyFavorite.value = true
  const next = !video.value.viewer.favorited
  try {
    const result = await videoApi.favoriteVideo(video.value.id, next)
    video.value.viewer.favorited = result.favorited
    video.value.counts.favorites = result.favoriteCount
    toast.success(result.favorited ? '已加入收藏' : '已取消收藏')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : '操作失败')
  } finally {
    busyFavorite.value = false
  }
}

async function copyLink() {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.success('影片链接已复制')
  } catch {
    toast.error('复制失败，请手动复制地址栏链接')
  }
}

function recordView() {
  if (!video.value || viewRecorded.value) return
  viewRecorded.value = true
  if (import.meta.client) {
    const key = `video-viewed-${video.value.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  }
  void videoApi.recordView(video.value.id, {}).then((result) => {
    if (video.value) video.value.counts.views = result.viewCount
  }).catch(() => {})
}

function saveProgress(current: number, duration: number) {
  if (!video.value || !user.value) return
  const progress = Math.round(current)
  const total = Math.round(duration || video.value.duration || 0)
  if (progress <= 0) return
  lastProgress.value = progress
  lastDuration.value = total
  lastProgressAt.value = Date.now()
  void videoApi.updateProgress(video.value.id, {
    progressSeconds: progress,
    durationSeconds: total,
  }).catch(() => {})
}

function onPlay() {
  recordView()
}

function onTimeUpdate(current: number, duration: number) {
  lastProgress.value = current
  lastDuration.value = duration
  if (!user.value) return
  if (Date.now() - lastProgressAt.value >= 15_000) {
    saveProgress(current, duration)
  }
}

function onPause() {
  if (lastProgress.value > 0) saveProgress(lastProgress.value, lastDuration.value)
}

function onEnded() {
  saveProgress(lastDuration.value, lastDuration.value)
}

function updateCommentCount(count: number) {
  if (video.value) video.value.counts.comments = count
}

onBeforeUnmount(() => {
  if (lastProgress.value > 0) saveProgress(lastProgress.value, lastDuration.value)
})
</script>

<template>
  <div v-if="video" class="page detail-page">
    <div class="container">
      <nav class="breadcrumb" aria-label="面包屑">
        <NuxtLink to="/">首页</NuxtLink>
        <span>/</span>
        <NuxtLink to="/videos">片库</NuxtLink>
        <span>/</span>
        <NuxtLink v-if="video.category" :to="`/videos?categoryId=${video.category.id}`">{{ video.category.name }}</NuxtLink>
        <span v-else>影片</span>
      </nav>

      <div class="watch-layout" :class="{ 'has-side': relatedVideos.length }">
        <div class="watch-main">
          <VideoPlayer
            :video-id="video.id"
            :src="video.playbackUrl"
            :poster="video.coverUrl"
            :progress-icon="video.playerIconUrl"
            :title="video.title"
            @play="onPlay"
            @timeupdate="onTimeUpdate"
            @pause="onPause"
            @ended="onEnded"
          />

          <div v-if="canSeeModeration && video.status !== 'PUBLISHED'" class="status-banner" :class="`status-banner--${statusTone}`">
            <AppIcon :name="video.status === 'PENDING' ? 'clock' : 'alert'" :size="16" />
            <div>
              <strong>{{ VIDEO_STATUS_LABEL[video.status] || video.status }}</strong>
              <span v-if="video.rejectReason">{{ video.rejectReason }}</span>
              <span v-else-if="video.status === 'PENDING'">影片正在等待管理员审核，目前只有你和管理员可见。</span>
              <span v-else>当前状态不会出现在公开片库中。</span>
            </div>
            <NuxtLink class="btn btn-subtle btn-sm" to="/my/videos">管理影片</NuxtLink>
          </div>
        </div>

        <aside v-if="relatedVideos.length" class="watch-side panel">
          <header class="watch-side-head">
            <div>
              <span class="side-label">UP NEXT</span>
              <h2>推荐放映</h2>
            </div>
            <span>{{ String(relatedVideos.length).padStart(2, '0') }}</span>
          </header>
          <div class="watch-side-list">
            <NuxtLink v-for="item in relatedVideos" :key="item.id" class="watch-rec" :to="`/videos/${item.id}`">
              <span class="watch-rec-thumb">
                <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.title" loading="lazy">
                <span v-else class="watch-rec-fallback">{{ [...item.title][0] || '光' }}</span>
                <small>{{ formatDuration(item.duration) }}</small>
              </span>
              <span class="watch-rec-copy">
                <strong>{{ item.title }}</strong>
                <span>{{ item.uploader?.nickname || item.uploader?.username || '补档放映室' }}</span>
                <em>{{ formatCount(item.counts.views) }} 次观看</em>
              </span>
            </NuxtLink>
          </div>
          <NuxtLink class="watch-side-more" to="/videos">
            查看全部影片
            <AppIcon name="arrowRight" :size="13" />
          </NuxtLink>
        </aside>
      </div>

      <div class="detail-grid">
        <article class="detail-main">
          <header class="detail-header">
            <div class="detail-topline">
              <span v-if="video.category" class="detail-category">{{ video.category.name }}</span>
              <span class="detail-code">FILM NO. {{ String(video.id).padStart(4, '0') }}</span>
            </div>
            <h1 class="detail-title">{{ video.title }}</h1>
            <div class="detail-meta">
              <span>{{ formatDate(video.publishedAt || video.createdAt) }}</span>
              <span class="dot" />
              <span>{{ formatDuration(video.duration) }}</span>
              <span class="dot" />
              <span>{{ formatCount(video.counts.views) }} 次观看</span>
              <span class="dot" />
              <span>{{ formatCount(video.counts.comments) }} 条留言</span>
            </div>
          </header>

          <div class="action-bar">
            <button
              class="action-btn"
              :class="{ 'is-active': video.viewer.vote === 'LIKE' }"
              type="button"
              :disabled="busyVote"
              @click="vote('LIKE')"
            >
              <AppIcon name="thumbsUp" :size="16" />
              <span>{{ formatCount(video.counts.likes) }}</span>
              喜欢
            </button>
            <button
              class="action-btn"
              :class="{ 'is-active': video.viewer.vote === 'DISLIKE' }"
              type="button"
              :disabled="busyVote"
              @click="vote('DISLIKE')"
            >
              <AppIcon name="thumbsDown" :size="16" />
              {{ formatCount(video.counts.dislikes) }}
            </button>
            <button
              class="action-btn"
              :class="{ 'is-active': video.viewer.favorited }"
              type="button"
              :disabled="busyFavorite"
              @click="toggleFavorite"
            >
              <AppIcon :name="video.viewer.favorited ? 'bookmarkFilled' : 'bookmark'" :size="16" />
              {{ video.viewer.favorited ? '已收藏' : '收藏' }}
              <span>{{ formatCount(video.counts.favorites) }}</span>
            </button>
            <button class="action-btn action-btn--ghost" type="button" @click="copyLink">
              <AppIcon name="copy" :size="15" />
              复制链接
            </button>
          </div>

          <section class="synopsis">
            <h2 class="synopsis-title">影片简介</h2>
            <p v-if="video.description" class="synopsis-text">{{ video.description }}</p>
            <p v-else class="synopsis-text synopsis-text--empty">创作者没有留下简介，让画面自己说话。</p>

            <div v-if="video.tags.length" class="synopsis-tags">
              <NuxtLink v-for="tag in video.tags" :key="tag.id" class="tag" :to="`/videos?tagId=${tag.id}`">
                #{{ tag.name }}
              </NuxtLink>
            </div>
          </section>
        </article>

        <aside class="detail-side">
          <div class="creator-card">
            <span class="side-label">SCREENED BY</span>
            <NuxtLink v-if="video.uploader" class="creator-link" :to="`/creators/${video.uploader.username}`">
              <UserAvatar
                :name="video.uploader.nickname"
                :username="video.uploader.username"
                :avatar="video.uploader.avatar"
                :size="52"
                ring
              />
              <span class="creator-copy">
                <strong>{{ video.uploader.nickname || video.uploader.username }}</strong>
                <small>@{{ video.uploader.username }}</small>
              </span>
              <AppIcon name="arrowRight" :size="15" />
            </NuxtLink>
            <div v-else class="creator-empty">放映者已离开</div>

            <div class="creator-stats">
              <div>
                <strong>{{ formatCount(video.counts.views) }}</strong>
                <span>观看</span>
              </div>
              <div>
                <strong>{{ formatCount(video.counts.likes) }}</strong>
                <span>喜欢</span>
              </div>
              <div>
                <strong>{{ formatCount(video.counts.favorites) }}</strong>
                <span>收藏</span>
              </div>
            </div>
          </div>

          <div class="film-facts">
            <span class="side-label">FILM FACTS</span>
            <dl>
              <div><dt>上映</dt><dd>{{ formatDate(video.publishedAt || video.createdAt) }}</dd></div>
              <div><dt>时长</dt><dd>{{ formatDuration(video.duration) }}</dd></div>
              <div><dt>来源</dt><dd>{{ video.sourceType === 'UPLOAD' ? '站内上传' : '外部链接' }}</dd></div>
              <div v-if="video.fileSize"><dt>文件</dt><dd>{{ formatBytes(video.fileSize) }}</dd></div>
              <div v-if="video.mimeType"><dt>格式</dt><dd>{{ video.mimeType }}</dd></div>
              <div v-if="video.playbackExpiresAt"><dt>播放地址</dt><dd>限时有效</dd></div>
            </dl>
          </div>

          <div v-if="isAdmin || isOwner" class="owner-panel">
            <AppIcon name="shield" :size="16" />
            <div>
              <strong>{{ isAdmin ? '管理员视角' : '创作者视角' }}</strong>
              <span>{{ isAdmin ? '可在审核后台调整影片状态' : '可在我的影片中查看审核进度' }}</span>
            </div>
            <NuxtLink class="btn btn-subtle btn-sm" :to="isAdmin ? `/admin/videos/${video.id}/edit` : '/my/videos'">
              {{ isAdmin ? '编辑影片' : '我的影片' }}
            </NuxtLink>
          </div>
        </aside>
      </div>

      <CommentSection
        :video-id="video.id"
        :video-uploader-id="video.uploaderId"
        @count-change="updateCommentCount"
      />

    </div>
  </div>
</template>

<style scoped>
.detail-page {
  padding-top: 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
}
.breadcrumb a {
  color: var(--muted);
  transition: color 150ms ease;
}
.breadcrumb a:hover {
  color: var(--amber-bright);
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(17, 20, 27, 0.55);
}
.status-banner--amber {
  border-color: rgba(243, 184, 95, 0.24);
  background: rgba(243, 184, 95, 0.06);
}
.status-banner--red {
  border-color: rgba(255, 123, 111, 0.22);
  background: rgba(255, 123, 111, 0.05);
}
.status-banner :deep(svg) {
  flex: 0 0 auto;
  color: var(--amber);
}
.status-banner > div {
  display: grid;
  flex: 1;
  gap: 2px;
}
.status-banner strong {
  font-size: 11.5px;
}
.status-banner span {
  color: var(--muted);
  font-size: 10.5px;
}

.watch-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}
.watch-layout.has-side {
  grid-template-columns: minmax(0, 1fr) 306px;
}
.watch-main {
  display: grid;
  min-width: 0;
  gap: 12px;
}
.watch-side {
  display: grid;
  gap: 0;
  padding: 17px;
}
.watch-side-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--line);
}
.watch-side-head > div {
  display: grid;
  gap: 5px;
}
.watch-side-head h2 {
  font-family: var(--font-display);
  font-size: 27px;
  font-weight: 400;
  letter-spacing: -0.025em;
}
.watch-side-head > span {
  color: var(--amber-bright);
  font-family: var(--font-display);
  font-size: 22px;
}
.watch-side-list {
  display: grid;
}
.watch-rec {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  padding: 11px 0;
  border-bottom: 1px solid var(--line);
  transition: transform 180ms var(--ease-out);
}
.watch-rec:hover {
  transform: translateX(3px);
}
.watch-rec-thumb {
  position: relative;
  display: grid;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--muted);
  background: var(--surface-2);
  font-family: var(--font-display);
  font-size: 20px;
}
.watch-rec-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 500ms var(--ease-out);
}
.watch-rec:hover .watch-rec-thumb img {
  transform: scale(1.05);
}
.watch-rec-thumb small {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 2px 4px;
  border-radius: 3px;
  color: #f3efe4;
  background: rgba(5, 6, 9, 0.75);
  font-family: var(--font-mono);
  font-size: 7px;
}
.watch-rec-fallback {
  color: var(--muted);
}
.watch-rec-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.watch-rec-copy strong {
  overflow: hidden;
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.watch-rec:hover .watch-rec-copy strong {
  color: var(--ink);
}
.watch-rec-copy span,
.watch-rec-copy em {
  overflow: hidden;
  color: var(--muted-weak);
  font-size: 8.5px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.watch-rec-copy em {
  color: var(--muted);
}
.watch-side-more {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 13px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.06em;
  transition: color 160ms ease;
}
.watch-side-more:hover {
  color: var(--amber-bright);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: clamp(30px, 4vw, 56px);
  align-items: start;
  margin-top: 34px;
}

.detail-main {
  min-width: 0;
}

.detail-topline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 13px;
}
.detail-category {
  padding: 4px 9px;
  border: 1px solid rgba(243, 184, 95, 0.25);
  border-radius: 99px;
  color: var(--amber);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.detail-code {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.detail-title {
  font-family: var(--font-display);
  font-size: clamp(38px, 5.2vw, 66px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1.03;
  text-wrap: balance;
}

.detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 17px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
}
.detail-meta .dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--muted-weak);
}

.action-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 25px;
  padding: 14px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--ink-soft);
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: 160ms ease;
}
.action-btn:hover {
  border-color: var(--line-strong);
  background: rgba(243, 239, 228, 0.04);
}
.action-btn.is-active {
  color: var(--amber-bright);
  border-color: rgba(243, 184, 95, 0.34);
  background: var(--amber-soft);
}
.action-btn span {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
}
.action-btn.is-active span {
  color: var(--amber);
}
.action-btn--ghost {
  margin-left: auto;
  color: var(--muted);
}

.synopsis {
  padding-top: 32px;
}
.synopsis-title {
  margin-bottom: 13px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.synopsis-text {
  max-width: 62em;
  color: var(--ink-soft);
  font-size: 13.5px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}
.synopsis-text--empty {
  color: var(--muted);
  font-style: italic;
}
.synopsis-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 22px;
}

.detail-side {
  position: sticky;
  top: calc(var(--header-height) + 26px);
  display: grid;
  gap: 13px;
}

.creator-card,
.film-facts,
.owner-panel {
  padding: 19px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(15, 18, 24, 0.52);
}

.side-label {
  display: block;
  margin-bottom: 13px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
}

.creator-link {
  display: flex;
  align-items: center;
  gap: 11px;
}
.creator-link > :deep(svg) {
  margin-left: auto;
  color: var(--muted-weak);
}
.creator-copy {
  display: grid;
  gap: 2px;
}
.creator-copy strong {
  font-size: 13px;
  font-weight: 600;
}
.creator-copy small {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
}
.creator-empty {
  color: var(--muted);
  font-size: 11px;
}

.creator-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-top: 17px;
  padding-top: 15px;
  border-top: 1px solid var(--line);
}
.creator-stats div {
  display: grid;
  gap: 2px;
}
.creator-stats strong {
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
}
.creator-stats span {
  color: var(--muted-weak);
  font-size: 8.5px;
}

.film-facts dl {
  display: grid;
  gap: 9px;
  margin: 0;
}
.film-facts dl > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 10.5px;
}
.film-facts dt {
  color: var(--muted-weak);
}
.film-facts dd {
  margin: 0;
  color: var(--ink-soft);
  text-align: right;
}

.owner-panel {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-color: rgba(243, 184, 95, 0.18);
  background: rgba(243, 184, 95, 0.045);
}
.owner-panel :deep(svg) {
  flex: 0 0 auto;
  color: var(--amber);
}
.owner-panel > div {
  display: grid;
  flex: 1;
  gap: 3px;
}
.owner-panel strong {
  font-size: 10.5px;
}
.owner-panel span {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.55;
}
.owner-panel .btn {
  flex: 0 0 auto;
}

@media (max-width: 1080px) {
  .watch-layout.has-side {
    grid-template-columns: minmax(0, 1fr) 274px;
  }
  .detail-grid {
    grid-template-columns: minmax(0, 1fr) 270px;
    gap: 32px;
  }
}

@media (max-width: 820px) {
  .watch-layout.has-side {
    grid-template-columns: 1fr;
  }
  .watch-side {
    order: 2;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .detail-side {
    position: static;
    grid-template-columns: 1fr 1fr;
  }
  .owner-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .detail-title {
    font-size: clamp(32px, 10vw, 46px);
  }
  .action-btn--ghost {
    margin-left: 0;
  }
  .detail-side {
    grid-template-columns: 1fr;
  }
  .status-banner {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .status-banner .btn {
    margin-left: 26px;
  }
}
</style>
