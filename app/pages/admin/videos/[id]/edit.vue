<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { VideoDetail } from '~/types'
import { formatBytes, formatCount, formatDate, formatDuration, VIDEO_STATUS_LABEL, videoStatusTone } from '~/utils/format'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const videoApi = useVideoApi()
const uploader = useUploader()
const toast = useToast()

const videoId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) && id > 0 ? id : 0
})

const { data, pending, error, refresh } = await useAsyncData(
  () => `admin-video-edit-${videoId.value}`,
  async () => {
    const [video, categories, tags] = await Promise.all([
      videoApi.getVideo(videoId.value),
      videoApi.listCategories(1, 100),
      videoApi.listTags(1, 100),
    ])
    return { video, categories: categories.items, tags: tags.items }
  },
  { watch: [videoId] },
)

if (error.value || !data.value?.video) {
  throw createError({
    statusCode: 404,
    statusMessage: '影片不存在或暂时无法加载',
  })
}

const video = computed(() => data.value?.video as VideoDetail)
const categories = computed(() => data.value?.categories ?? [])
const tags = computed(() => data.value?.tags ?? [])
const maxImageSize = 10 * 1024 * 1024

const form = reactive({
  title: '',
  description: '',
  categoryId: '',
  duration: 0,
  tagIds: [] as number[],
  coverUrl: '',
  playerIconUrl: '',
})

const initialized = ref(false)
const coverFile = ref<File | null>(null)
const coverPreview = ref('')
const playerIconFile = ref<File | null>(null)
const playerIconPreview = ref('')
const coverInput = ref<HTMLInputElement | null>(null)
const playerIconInput = ref<HTMLInputElement | null>(null)
const saving = ref(false)
const initialCoverUrl = ref('')

const previewCover = computed(() => coverPreview.value || form.coverUrl.trim() || '')
const previewPlayerIcon = computed(() => playerIconPreview.value || form.playerIconUrl.trim() || '')
const statusTone = computed(() => videoStatusTone(video.value.status))
const canEdit = computed(() => video.value.permissions.canEdit)

function syncForm(target: VideoDetail) {
  form.title = target.title
  form.description = target.description || ''
  form.categoryId = target.categoryId ? String(target.categoryId) : target.category?.id ? String(target.category.id) : ''
  form.duration = target.duration
  form.tagIds = target.tags.map(tag => tag.id)
  form.coverUrl = target.coverUrl || ''
  form.playerIconUrl = target.playerIconUrl || ''
  initialCoverUrl.value = target.coverUrl || ''
  initialized.value = true
}

watch(video, (value) => {
  if (value && !initialized.value) syncForm(value)
}, { immediate: true })

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

function selectCover(file: File | undefined) {
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    toast.error('封面请选择 JPEG / PNG / WebP / GIF 图片')
    return
  }
  if (file.size > maxImageSize) {
    toast.error(`封面不能超过 ${formatBytes(maxImageSize)}`)
    return
  }
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

function selectPlayerIcon(file: File | undefined) {
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    toast.error('进度图标请选择 JPEG / PNG / WebP / GIF 图片')
    return
  }
  if (file.size > maxImageSize) {
    toast.error(`进度图标不能超过 ${formatBytes(maxImageSize)}`)
    return
  }
  if (playerIconPreview.value) URL.revokeObjectURL(playerIconPreview.value)
  playerIconFile.value = file
  playerIconPreview.value = URL.createObjectURL(file)
}

function onCoverInput(event: Event) {
  const input = event.target as HTMLInputElement
  selectCover(input.files?.[0])
  input.value = ''
}

function onPlayerIconInput(event: Event) {
  const input = event.target as HTMLInputElement
  selectPlayerIcon(input.files?.[0])
  input.value = ''
}

function resetCover() {
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
  coverPreview.value = ''
  coverFile.value = null
  form.coverUrl = ''
}

function resetPlayerIcon() {
  if (playerIconPreview.value) URL.revokeObjectURL(playerIconPreview.value)
  playerIconPreview.value = ''
  playerIconFile.value = null
  form.playerIconUrl = ''
}

function toggleTag(id: number) {
  form.tagIds = form.tagIds.includes(id)
    ? form.tagIds.filter(tagId => tagId !== id)
    : form.tagIds.length >= 10 ? form.tagIds : [...form.tagIds, id]
}

async function save() {
  if (!canEdit.value || saving.value) return
  if (!form.title.trim()) {
    toast.error('影片标题不能为空')
    return
  }
  if (!coverFile.value && form.coverUrl.trim() && !isHttpUrl(form.coverUrl.trim())) {
    toast.error('封面地址必须是 http(s) 链接')
    return
  }
  if (!playerIconFile.value && form.playerIconUrl.trim() && !isHttpUrl(form.playerIconUrl.trim())) {
    toast.error('进度图标地址必须是 http(s) 链接')
    return
  }

  saving.value = true
  try {
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      duration: Math.max(0, Math.round(Number(form.duration) || 0)),
      tagIds: form.tagIds,
    }

    if (coverFile.value) {
      const uploadedCover = await uploader.upload(coverFile.value, 'IMAGE')
      body.coverFileId = uploadedCover.id
    } else if (form.coverUrl.trim() !== initialCoverUrl.value) {
      body.coverFileId = null
      body.coverUrl = form.coverUrl.trim() || null
    }

    if (playerIconFile.value) {
      const uploadedIcon = await uploader.upload(playerIconFile.value, 'IMAGE')
      if (!uploadedIcon.publicUrl) {
        throw new Error('对象存储未配置公开访问地址，请改用进度图标 URL')
      }
      body.playerIconUrl = uploadedIcon.publicUrl
    } else {
      body.playerIconUrl = form.playerIconUrl.trim() || null
    }

    const updated = await videoApi.updateVideo(videoId.value, body)
    toast.success('影片信息已保存')
    await refresh()
    initialized.value = false
    syncForm(updated)
    if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
    coverPreview.value = ''
    coverFile.value = null
    if (playerIconPreview.value) URL.revokeObjectURL(playerIconPreview.value)
    playerIconPreview.value = ''
    playerIconFile.value = null
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '保存失败'
    toast.error(message.includes('对象存储') ? `${message}。也可以填写图片 URL。` : message)
  } finally {
    saving.value = false
  }
}

function leave() {
  void router.push({ path: '/admin/review', query: { status: video.value.status } })
}

onBeforeUnmount(() => {
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
  if (playerIconPreview.value) URL.revokeObjectURL(playerIconPreview.value)
})

useSeoMeta({
  title: () => `编辑 ${video.value.title}`,
  description: '管理员编辑影片信息、封面与播放进度图标。',
})
</script>

<template>
  <div v-if="pending" class="admin-page">
    <div class="skeleton" style="height: 58px; border-radius: 12px;" />
    <div class="skeleton" style="height: 520px; border-radius: 16px;" />
  </div>

  <div v-else class="admin-page admin-edit-page">
    <header class="admin-head">
      <div>
        <span class="eyebrow">FILM CONTROL · 影片编辑</span>
        <h1>编辑影片</h1>
        <p>修改影片的公开信息、封面和播放进度图标，审核状态不会因此改变。</p>
      </div>
      <div class="admin-head-actions">
        <NuxtLink class="btn btn-subtle btn-sm" :to="`/videos/${video.id}`">
          <AppIcon name="external" :size="13" />
          预览
        </NuxtLink>
        <button class="btn btn-ghost btn-sm" type="button" @click="leave">返回审核队列</button>
      </div>
    </header>

    <div v-if="!canEdit" class="form-error">当前账户没有编辑这支影片的权限。</div>

    <form class="edit-layout" @submit.prevent="save">
      <div class="edit-main">
        <section class="panel edit-section">
          <header class="edit-section-head">
            <span class="edit-step">01</span>
            <div>
              <h2>基本信息</h2>
              <p>这些信息会直接显示在片库和影片详情页。</p>
            </div>
          </header>

          <div class="field">
            <label class="field-label" for="edit-video-title">影片标题 <span class="required">*</span></label>
            <input
              id="edit-video-title"
              v-model="form.title"
              class="input"
              maxlength="200"
              placeholder="给这支影片一个标题"
              required
            >
          </div>

          <div class="field">
            <label class="field-label" for="edit-video-description">影片简介</label>
            <textarea
              id="edit-video-description"
              v-model="form.description"
              class="textarea"
              rows="6"
              maxlength="5000"
              placeholder="写下影片简介或观看提示"
            />
            <span class="field-hint">最多 5000 个字符。</span>
          </div>

          <div class="edit-form-grid">
            <div class="field">
              <label class="field-label" for="edit-video-category">分类</label>
              <select id="edit-video-category" v-model="form.categoryId" class="select">
                <option value="">不设置分类</option>
                <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="field-label" for="edit-video-duration">时长（秒）</label>
              <input id="edit-video-duration" v-model.number="form.duration" class="input" type="number" min="0" max="86400">
              <span class="field-hint">{{ formatDuration(form.duration) }}</span>
            </div>
          </div>

          <div class="field">
            <label class="field-label">标签 <span class="field-label__hint">最多 10 个</span></label>
            <div class="edit-tags">
              <button
                v-for="tag in tags"
                :key="tag.id"
                type="button"
                class="tag"
                :class="{ 'is-active': form.tagIds.includes(tag.id) }"
                @click="toggleTag(tag.id)"
              >
                #{{ tag.name }}
              </button>
            </div>
          </div>
        </section>

        <section class="panel edit-section">
          <header class="edit-section-head">
            <span class="edit-step">02</span>
            <div>
              <h2>封面与播放图标</h2>
              <p>封面展示在片库；进度图标会替换播放器进度条上的拖动标志。</p>
            </div>
          </header>

          <div class="edit-image-row">
            <div class="edit-image-preview">
              <img v-if="previewCover" :src="previewCover" alt="封面预览">
              <span v-else><AppIcon name="image" :size="21" />封面</span>
            </div>
            <div class="edit-image-copy">
              <strong>封面图片</strong>
              <p>建议 16:9。可以直接上传图片，或填写公开图片地址。</p>
              <div class="edit-image-actions">
                <button class="btn btn-subtle btn-sm" type="button" @click="coverInput?.click()">
                  <AppIcon name="upload" :size="13" />
                  上传封面
                </button>
                <button v-if="previewCover" class="text-button" type="button" @click="resetCover">移除</button>
                <input ref="coverInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onCoverInput">
              </div>
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="edit-video-cover">封面地址 <span class="field-label__hint">上传封面后忽略</span></label>
            <input id="edit-video-cover" v-model="form.coverUrl" class="input" type="url" placeholder="https://example.com/cover.jpg">
          </div>

          <div class="edit-image-row">
            <div class="edit-image-preview edit-image-preview--icon">
              <img v-if="previewPlayerIcon" :src="previewPlayerIcon" alt="进度图标预览">
              <span v-else><AppIcon name="spark" :size="20" /></span>
            </div>
            <div class="edit-image-copy">
              <strong>播放进度图标</strong>
              <p>可选。建议透明背景的正方形 PNG / WebP，显示在进度条拖动位置。</p>
              <div class="edit-image-actions">
                <button class="btn btn-subtle btn-sm" type="button" @click="playerIconInput?.click()">
                  <AppIcon name="upload" :size="13" />
                  上传图标
                </button>
                <button v-if="previewPlayerIcon" class="text-button" type="button" @click="resetPlayerIcon">移除</button>
                <input ref="playerIconInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onPlayerIconInput">
              </div>
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="edit-video-player-icon">进度图标地址 <span class="field-label__hint">上传图标后忽略</span></label>
            <input id="edit-video-player-icon" v-model="form.playerIconUrl" class="input" type="url" placeholder="https://example.com/progress-icon.png">
          </div>
        </section>
      </div>

      <aside class="edit-side">
        <section class="panel edit-summary">
          <div class="edit-summary-head">
            <span class="side-label">FILM SNAPSHOT</span>
            <span class="badge" :class="`badge--${statusTone}`">{{ VIDEO_STATUS_LABEL[video.status] }}</span>
          </div>
          <h2>{{ video.title }}</h2>
          <div class="edit-summary-stats">
            <div><strong>{{ formatCount(video.counts.views) }}</strong><span>观看</span></div>
            <div><strong>{{ formatCount(video.counts.likes) }}</strong><span>喜欢</span></div>
            <div><strong>{{ formatCount(video.counts.comments) }}</strong><span>评论</span></div>
          </div>
          <dl>
            <div><dt>影片编号</dt><dd>NO. {{ String(video.id).padStart(4, '0') }}</dd></div>
            <div><dt>投稿者</dt><dd>{{ video.uploader?.nickname || video.uploader?.username || '未知' }}</dd></div>
            <div><dt>提交时间</dt><dd>{{ formatDate(video.createdAt) }}</dd></div>
            <div><dt>时长</dt><dd>{{ formatDuration(video.duration) }}</dd></div>
            <div><dt>来源</dt><dd>{{ video.sourceType === 'UPLOAD' ? '站内上传' : '外部链接' }}</dd></div>
          </dl>
        </section>

        <section class="panel edit-save">
          <span class="side-label">CHANGES</span>
          <p>保存后立即生效。已发布影片修改后仍保持已发布状态。</p>
          <button class="btn btn-primary" type="submit" :disabled="saving || !canEdit">
            <span v-if="saving" class="spinner" />
            <AppIcon v-else name="check" :size="15" />
            {{ saving ? '正在保存…' : '保存修改' }}
          </button>
          <button class="btn btn-ghost btn-sm" type="button" :disabled="saving" @click="leave">取消</button>
          <NuxtLink class="edit-preview-link" :to="`/videos/${video.id}`">
            打开影片页
            <AppIcon name="arrowRight" :size="13" />
          </NuxtLink>
        </section>
      </aside>
    </form>
  </div>
</template>

<style scoped>
.admin-edit-page {
  display: grid;
  gap: 22px;
}
.admin-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}
.admin-head > div:first-child {
  display: grid;
  gap: 8px;
}
.admin-head h1 {
  font-family: var(--font-display);
  font-size: clamp(42px, 5vw, 64px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
}
.admin-head p {
  max-width: 620px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}
.admin-head-actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.edit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 304px;
  gap: 22px;
  align-items: start;
}
.edit-main {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.edit-section {
  display: grid;
  gap: 17px;
  padding: clamp(18px, 2.2vw, 26px);
}
.edit-section-head {
  display: flex;
  gap: 13px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--line);
}
.edit-step {
  color: var(--amber-bright);
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 1;
}
.edit-section-head h2 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
  letter-spacing: -0.02em;
}
.edit-section-head p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}
.edit-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.edit-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.edit-tags .tag.is-active {
  color: var(--amber-bright);
  border-color: rgba(169, 103, 22, 0.34);
  background: rgba(169, 103, 22, 0.1);
}
.edit-image-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}
.edit-image-preview {
  display: grid;
  width: 112px;
  flex: 0 0 auto;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--muted);
  background: var(--surface-2);
}
.edit-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.edit-image-preview > span {
  display: grid;
  justify-items: center;
  gap: 5px;
  font-size: 8px;
}
.edit-image-preview--icon {
  width: 66px;
  aspect-ratio: 1;
}
.edit-image-preview--icon img {
  object-fit: contain;
  padding: 7px;
}
.edit-image-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.edit-image-copy strong {
  color: var(--ink-soft);
  font-size: 11px;
}
.edit-image-copy p {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.7;
}
.edit-image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 3px;
}
.edit-side {
  position: sticky;
  top: calc(var(--header-height) + 24px);
  display: grid;
  gap: 13px;
}
.edit-summary {
  display: grid;
  gap: 12px;
  padding: 18px;
}
.edit-summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.edit-summary h2 {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.edit-summary-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 11px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.edit-summary-stats div {
  display: grid;
  gap: 2px;
}
.edit-summary-stats strong {
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
}
.edit-summary-stats span {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7px;
}
.edit-summary dl {
  display: grid;
  gap: 8px;
  margin: 0;
}
.edit-summary dl > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.edit-summary dt {
  color: var(--muted);
  font-size: 9px;
}
.edit-summary dd {
  margin: 0;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 9.5px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.edit-save {
  display: grid;
  gap: 9px;
  padding: 18px;
}
.edit-save p {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.7;
}
.edit-save .btn-primary {
  margin-top: 4px;
}
.edit-preview-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  padding-top: 11px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
}
.edit-preview-link:hover {
  color: var(--amber-bright);
}
@media (max-width: 1000px) {
  .edit-layout {
    grid-template-columns: minmax(0, 1fr) 270px;
  }
}
@media (max-width: 840px) {
  .edit-layout {
    grid-template-columns: 1fr;
  }
  .edit-side {
    position: static;
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 580px) {
  .edit-form-grid,
  .edit-side {
    grid-template-columns: 1fr;
  }
  .edit-image-row {
    align-items: flex-start;
  }
  .edit-image-preview {
    width: 82px;
  }
}
</style>
