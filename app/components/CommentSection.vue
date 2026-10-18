<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CommentSort, VideoComment } from '~/types'
import { relativeTime } from '~/utils/format'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  videoId: number
  videoUploaderId?: number | null
}>()

const emit = defineEmits<{ 'count-change': [count: number] }>()

const auth = useAuth()
const { user } = auth
const videoApi = useVideoApi()
const toast = useToast()

const page = ref(1)
const sort = ref<CommentSort>('newest')
const content = ref('')
const submitting = ref(false)
const votingId = ref<number | null>(null)

const sortOptions: Array<{ value: CommentSort; label: string }> = [
  { value: 'newest', label: '最新' },
  { value: 'hottest', label: '最热' },
  { value: 'oldest', label: '最早' },
]

const { data, pending, error, refresh } = await useAsyncData(
  () => `video-comments-${props.videoId}-${sort.value}-${page.value}`,
  () => videoApi.listComments(props.videoId, page.value, 10, sort.value),
  {
    watch: [sort, page],
    default: () => ({ items: [] as VideoComment[], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
  },
)

const comments = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const remaining = computed(() => 500 - content.value.length)

watch(total, (value) => emit('count-change', value), { immediate: true })

function canDelete(comment: VideoComment) {
  if (!user.value) return false
  return user.value.role === 'ADMIN'
    || user.value.id === comment.user?.id
    || user.value.id === props.videoUploaderId
}

function goLogin() {
  void navigateTo({ path: '/login', query: { redirect: `/videos/${props.videoId}` } })
}

async function submit() {
  if (!user.value) {
    goLogin()
    return
  }
  const text = content.value.trim()
  if (!text || submitting.value) return
  submitting.value = true
  try {
    await videoApi.createComment(props.videoId, text)
    content.value = ''
    page.value = 1
    await refresh()
    toast.success('评论已放上银幕')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : '评论失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

async function vote(comment: VideoComment, value: 'LIKE' | 'DISLIKE') {
  if (!user.value) {
    goLogin()
    return
  }
  if (votingId.value) return
  votingId.value = comment.id
  const next = comment.viewerVote === value ? null : value
  try {
    const result = await videoApi.voteComment(props.videoId, comment.id, next)
    comment.counts.likes = result.likeCount
    comment.counts.dislikes = result.dislikeCount
    comment.viewerVote = result.userVote
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : '操作失败')
  } finally {
    votingId.value = null
  }
}

async function remove(comment: VideoComment) {
  if (!import.meta.client) return
  if (!window.confirm('确定删除这条评论吗？')) return
  try {
    await videoApi.deleteComment(props.videoId, comment.id)
    await refresh()
    toast.success('评论已删除')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : '删除失败')
  }
}

function changePage(value: number) {
  page.value = value
}
</script>

<template>
  <section class="comments" aria-labelledby="comments-title">
    <header class="comments-head">
      <div class="comments-title-wrap">
        <span class="section-kicker">AUDIENCE NOTES</span>
        <h2 id="comments-title" class="comments-title">
          观众留言
          <span>{{ total }}</span>
        </h2>
      </div>
      <div class="segmented">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          type="button"
          :class="{ 'is-active': sort === option.value }"
          @click="sort = option.value; page = 1"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <div v-if="user" class="comment-form">
      <UserAvatar :name="user.nickname" :username="user.username" :avatar="user.avatar" :size="42" ring />
      <div class="comment-form-body">
        <textarea
          v-model="content"
          class="comment-input"
          maxlength="500"
          placeholder="写下你在这一帧里看见的东西…"
          aria-label="评论内容"
          rows="3"
        />
        <div class="comment-form-foot">
          <span class="comment-counter" :class="{ 'is-warning': remaining < 40 }">
            还可以写 {{ remaining }} 字
          </span>
          <button class="btn btn-primary btn-sm" type="button" :disabled="!content.trim() || submitting" @click="submit">
            <span v-if="submitting" class="spinner" />
            <AppIcon v-else name="message" :size="14" />
            留下评论
          </button>
        </div>
      </div>
    </div>

    <div v-else class="comment-login">
      <UserAvatar :name="null" username="guest" :size="42" />
      <div>
        <strong>登录后，把你的感受留在银幕上</strong>
        <span>评论、点赞与收藏会记录在你的账户里。</span>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" @click="goLogin">登录</button>
    </div>

    <div v-if="error" class="comments-error">
      <AppIcon name="alert" :size="15" />
      评论加载失败，请稍后重试。
      <button type="button" @click="refresh()">重试</button>
    </div>

    <div v-if="pending" class="comment-skeletons">
      <div v-for="index in 3" :key="index" class="comment-skeleton">
        <div class="skeleton comment-avatar" />
        <div class="comment-skeleton-lines">
          <div class="skeleton" style="width: 25%; height: 11px;" />
          <div class="skeleton" style="width: 90%; height: 13px;" />
          <div class="skeleton" style="width: 65%; height: 13px;" />
        </div>
      </div>
    </div>

    <div v-else-if="comments.length" class="comment-list">
      <article v-for="comment in comments" :key="comment.id" class="comment">
        <UserAvatar
          :name="comment.user?.nickname"
          :username="comment.user?.username"
          :avatar="comment.user?.avatar"
          :size="42"
        />
        <div class="comment-main">
          <header class="comment-meta">
            <strong>{{ comment.user?.nickname || comment.user?.username || '访客' }}</strong>
            <span>@{{ comment.user?.username || 'deleted' }}</span>
            <time>{{ relativeTime(comment.createdAt) }}</time>
          </header>
          <p class="comment-content">{{ comment.content }}</p>
          <footer class="comment-actions">
            <button
              type="button"
              class="comment-vote"
              :class="{ 'is-active': comment.viewerVote === 'LIKE' }"
              :disabled="votingId === comment.id"
              @click="vote(comment, 'LIKE')"
            >
              <AppIcon :name="comment.viewerVote === 'LIKE' ? 'thumbsUp' : 'thumbsUp'" :size="13" />
              {{ comment.counts.likes }}
            </button>
            <button
              type="button"
              class="comment-vote"
              :class="{ 'is-active': comment.viewerVote === 'DISLIKE' }"
              :disabled="votingId === comment.id"
              @click="vote(comment, 'DISLIKE')"
            >
              <AppIcon name="thumbsDown" :size="13" />
              {{ comment.counts.dislikes }}
            </button>
            <button
              v-if="canDelete(comment)"
              type="button"
              class="comment-delete"
              @click="remove(comment)"
            >
              <AppIcon name="trash" :size="12" />
              删除
            </button>
          </footer>
        </div>
      </article>
    </div>

    <div v-else class="comment-empty">
      <AppIcon name="message" :size="21" />
      <p>还没有人留下笔记。第一句话，交给你。</p>
    </div>

    <PaginationBar
      v-if="(data?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="data?.totalPages ?? 1"
      @update:page="changePage"
    />
  </section>
</template>

<style scoped>
.comments {
  margin-top: clamp(48px, 6vw, 78px);
  padding-top: 34px;
  border-top: 1px solid var(--line);
}

.comments-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}
.comments-title-wrap {
  display: grid;
  gap: 7px;
}
.comments-title {
  font-family: var(--font-display);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 400;
  letter-spacing: -0.02em;
}
.comments-title span {
  margin-left: 8px;
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 13px;
  vertical-align: middle;
}

.comment-form {
  display: flex;
  gap: 13px;
  padding: 17px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(17, 20, 27, 0.48);
}
.comment-form-body {
  display: grid;
  flex: 1;
  gap: 8px;
}
.comment-input {
  width: 100%;
  min-height: 82px;
  padding: 12px 13px;
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: 0;
  color: var(--ink);
  background: rgba(6, 7, 10, 0.55);
  font-size: 12.5px;
  line-height: 1.7;
  resize: vertical;
  transition: border-color 160ms ease;
}
.comment-input:focus {
  border-color: rgba(243, 184, 95, 0.5);
}
.comment-input::placeholder {
  color: var(--muted-weak);
}
.comment-form-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.comment-counter {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.04em;
}
.comment-counter.is-warning {
  color: var(--amber);
}

.comment-login {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius);
  background: rgba(17, 20, 27, 0.3);
}
.comment-login > div {
  display: grid;
  flex: 1;
  gap: 3px;
}
.comment-login strong {
  font-size: 12.5px;
}
.comment-login span {
  color: var(--muted);
  font-size: 10px;
}

.comment-list {
  display: grid;
  margin-top: 10px;
}
.comment {
  display: flex;
  gap: 13px;
  padding: 24px 0;
  border-bottom: 1px solid var(--line);
}
.comment-main {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 8px;
}
.comment-meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 7px;
}
.comment-meta strong {
  font-size: 12.5px;
  font-weight: 600;
}
.comment-meta span {
  color: var(--muted-weak);
  font-size: 9.5px;
}
.comment-meta time {
  margin-left: auto;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
}
.comment-content {
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}
.comment-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.comment-vote {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: transparent;
  font-size: 9.5px;
  cursor: pointer;
  transition: 150ms ease;
}
.comment-vote:hover {
  color: var(--ink-soft);
  border-color: var(--line-strong);
}
.comment-vote.is-active {
  color: var(--amber);
  border-color: rgba(243, 184, 95, 0.3);
  background: var(--amber-soft);
}
.comment-delete {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 99px;
  color: var(--muted-weak);
  background: transparent;
  font-size: 9px;
  cursor: pointer;
}
.comment-delete:hover {
  color: var(--danger);
}

.comment-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 50px 20px;
  color: var(--muted);
  text-align: center;
  font-size: 11.5px;
}
.comment-empty :deep(svg) {
  color: var(--amber);
  opacity: 0.75;
}

.comment-skeletons {
  display: grid;
  padding-top: 12px;
}
.comment-skeleton {
  display: flex;
  gap: 13px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}
.comment-avatar {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 50%;
}
.comment-skeleton-lines {
  display: grid;
  flex: 1;
  gap: 9px;
}
.comments-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  padding: 10px 13px;
  border: 1px solid rgba(255, 123, 111, 0.24);
  border-radius: 9px;
  color: #ffb0a6;
  background: rgba(255, 123, 111, 0.06);
  font-size: 11px;
}
.comments-error button {
  margin-left: auto;
  color: inherit;
  background: transparent;
  font-size: 10px;
  text-decoration: underline;
  cursor: pointer;
}

@media (max-width: 640px) {
  .comments-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 13px;
  }
  .comment-form {
    padding: 13px;
  }
  .comment-login {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .comment-meta time {
    width: 100%;
    margin-left: 0;
  }
}
</style>
