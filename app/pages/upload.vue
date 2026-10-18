<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useUploader } from '~/composables/useUploader'
import { useToast } from '~/composables/useToast'
import { formatBytes, formatDuration } from '~/utils/format'
import type { Category, ConfigItem, TagItem } from '~/types'
import { PLAYER_ICON_PRESETS } from '~/utils/playerIcons'

const auth = useAuth()
const { canUpload, isAdmin } = auth
const videoApi = useVideoApi()
const uploader = useUploader()
const toast = useToast()

const { data: taxonomy } = await useAsyncData('upload-taxonomy', async () => {
  const [categoriesResult, tagsResult, configsResult] = await Promise.allSettled([
    videoApi.listCategories(1, 100),
    videoApi.listTags(1, 100),
    videoApi.listConfigs({ type: 'STORAGE', pageSize: 100 }),
  ])
  return {
    categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.items : [] as Category[],
    tags: tagsResult.status === 'fulfilled' ? tagsResult.value.items : [] as TagItem[],
    configs: configsResult.status === 'fulfilled' ? configsResult.value.items : [] as ConfigItem[],
  }
}, {
  default: () => ({ categories: [] as Category[], tags: [] as TagItem[], configs: [] as ConfigItem[] }),
})

const categories = computed(() => taxonomy.value?.categories ?? [])
const tags = computed(() => taxonomy.value?.tags ?? [])

const configValue = (key: string) => taxonomy.value?.configs.find(item => item.k === key)?.v
const maxVideoSize = computed(() => Number(configValue('MAX_VIDEO_SIZE_BYTES')) || 1024 * 1024 * 1024)
const maxImageSize = computed(() => Number(configValue('MAX_IMAGE_SIZE_BYTES')) || 10 * 1024 * 1024)

const mode = ref<'upload' | 'external'>('upload')
const videoFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const playerIconFile = ref<File | null>(null)
const videoPreview = ref('')
const coverPreview = ref('')
const playerIconPreview = ref('')
const dragActive = ref(false)
const submitting = ref(false)
const uploadPercent = ref(0)
const errorMessage = ref('')
const selectedTags = ref<number[]>([])
const videoInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)
const playerIconInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  title: '',
  description: '',
  categoryId: '',
  videoUrl: '',
  coverUrl: '',
  playerIconUrl: '',
  duration: 0,
})

const selectedCategory = computed(() => categories.value.find(item => String(item.id) === form.categoryId) || null)
const previewCover = computed(() => coverPreview.value || form.coverUrl.trim() || '')
const previewPlayerIcon = computed(() => playerIconPreview.value || form.playerIconUrl.trim() || '')
const previewTags = computed(() => tags.value.filter(tag => selectedTags.value.includes(tag.id)).slice(0, 5))

const canSubmit = computed(() => {
  if (!canUpload.value) return false
  if (!form.title.trim()) return false
  if (mode.value === 'upload') return Boolean(videoFile.value)
  return Boolean(form.videoUrl.trim())
})

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

function isPlayerIconUrl(value: string) {
  return value.startsWith('/player-icons/') || isHttpUrl(value)
}

function revokeVideoPreview() {
  if (videoPreview.value) URL.revokeObjectURL(videoPreview.value)
  videoPreview.value = ''
}

function revokeCoverPreview() {
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
  coverPreview.value = ''
}

function revokePlayerIconPreview() {
  if (playerIconPreview.value) URL.revokeObjectURL(playerIconPreview.value)
  playerIconPreview.value = ''
}

async function chooseVideo(file: File | undefined) {
  if (!file) return
  errorMessage.value = ''
  if (!['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'].includes(file.type)) {
    errorMessage.value = '请选择 MP4 / WebM / MOV / M4V / OGG 视频'
    return
  }
  if (file.size > maxVideoSize.value) {
    errorMessage.value = `视频不能超过 ${formatBytes(maxVideoSize.value)}`
    return
  }
  revokeVideoPreview()
  videoFile.value = file
  videoPreview.value = URL.createObjectURL(file)
  const duration = await uploader.videoDuration(file)
  if (duration > 0) form.duration = duration
}

function chooseCover(file: File | undefined) {
  if (!file) return
  errorMessage.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    errorMessage.value = '封面请选择 JPEG / PNG / WebP / GIF 图片'
    return
  }
  if (file.size > maxImageSize.value) {
    errorMessage.value = `封面不能超过 ${formatBytes(maxImageSize.value)}`
    return
  }
  revokeCoverPreview()
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

function choosePlayerIcon(file: File | undefined) {
  if (!file) return
  errorMessage.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    errorMessage.value = '进度图标请选择 JPEG / PNG / WebP / GIF 图片'
    return
  }
  if (file.size > maxImageSize.value) {
    errorMessage.value = `进度图标不能超过 ${formatBytes(maxImageSize.value)}`
    return
  }
  revokePlayerIconPreview()
  playerIconFile.value = file
  playerIconPreview.value = URL.createObjectURL(file)
}

function onVideoInput(event: Event) {
  const input = event.target as HTMLInputElement
  void chooseVideo(input.files?.[0])
  input.value = ''
}

function onCoverInput(event: Event) {
  const input = event.target as HTMLInputElement
  chooseCover(input.files?.[0])
  input.value = ''
}

function onPlayerIconInput(event: Event) {
  const input = event.target as HTMLInputElement
  choosePlayerIcon(input.files?.[0])
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragActive.value = false
  void chooseVideo(event.dataTransfer?.files?.[0])
}

function toggleTag(id: number) {
  selectedTags.value = selectedTags.value.includes(id)
    ? selectedTags.value.filter(tagId => tagId !== id)
    : selectedTags.value.length >= 10 ? selectedTags.value : [...selectedTags.value, id]
}

function resetCover() {
  revokeCoverPreview()
  coverFile.value = null
  form.coverUrl = ''
}

function resetPlayerIcon() {
  revokePlayerIconPreview()
  playerIconFile.value = null
  form.playerIconUrl = ''
}

function selectPlayerIconPreset(url: string) {
  revokePlayerIconPreview()
  playerIconFile.value = null
  form.playerIconUrl = url
}

function switchMode(next: 'upload' | 'external') {
  mode.value = next
  errorMessage.value = ''
}

async function submit() {
  if (submitting.value) return
  errorMessage.value = ''

  if (!canUpload.value) {
    errorMessage.value = '当前账户没有上传权限'
    return
  }
  if (!form.title.trim()) {
    errorMessage.value = '请填写影片标题'
    return
  }
  if (mode.value === 'upload' && !videoFile.value) {
    errorMessage.value = '请先选择一个视频文件'
    return
  }
  if (mode.value === 'external' && !isHttpUrl(form.videoUrl.trim())) {
    errorMessage.value = '请填写有效的 http(s) 视频地址'
    return
  }
  if (form.coverUrl.trim() && !isHttpUrl(form.coverUrl.trim())) {
    errorMessage.value = '封面地址必须是 http(s) 链接，或改为上传图片'
    return
  }
  if (isAdmin.value && !playerIconFile.value && form.playerIconUrl.trim() && !isPlayerIconUrl(form.playerIconUrl.trim())) {
    errorMessage.value = '进度图标地址必须是 http(s) 链接或内置图标'
    return
  }

  submitting.value = true
  uploadPercent.value = 0
  try {
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      tagIds: selectedTags.value,
      duration: Math.max(0, Math.round(Number(form.duration) || 0)),
    }

    if (mode.value === 'upload' && videoFile.value) {
      const uploadedVideo = await uploader.upload(videoFile.value, 'VIDEO', (percent) => {
        uploadPercent.value = Math.round(percent * 0.72)
      })
      body.videoFileId = uploadedVideo.id

      if (coverFile.value) {
        const uploadedCover = await uploader.upload(coverFile.value, 'IMAGE', (percent) => {
          uploadPercent.value = 72 + Math.round(percent * 0.24)
        })
        body.coverFileId = uploadedCover.id
      } else if (form.coverUrl.trim()) {
        body.coverUrl = form.coverUrl.trim()
      }
    } else {
      body.videoUrl = form.videoUrl.trim()
      if (form.coverUrl.trim()) body.coverUrl = form.coverUrl.trim()
    }

    if (isAdmin.value) {
      if (playerIconFile.value) {
        const uploadedIcon = await uploader.upload(playerIconFile.value, 'IMAGE', (percent) => {
          uploadPercent.value = Math.max(uploadPercent.value, 90 + Math.round(percent * 0.08))
        })
        if (!uploadedIcon.publicUrl) {
          throw new Error('对象存储未配置公开访问地址，请改用进度图标 URL')
        }
        body.playerIconUrl = uploadedIcon.publicUrl
      } else if (form.playerIconUrl.trim()) {
        body.playerIconUrl = form.playerIconUrl.trim()
      }
    }

    uploadPercent.value = 98
    const created = await videoApi.createVideo(body)
    uploadPercent.value = 100
    toast.success(created.status === 'PUBLISHED' ? '影片已发布' : '影片已提交，等待审核')
    await navigateTo('/my/videos')
  } catch (error) {
    const message = error instanceof Error ? error.message : '提交失败，请稍后重试'
    errorMessage.value = message
    if (message.includes('对象存储')) {
      errorMessage.value = `${message}。你也可以切换到“外部链接”提交视频地址。`
    }
    toast.error(message)
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  revokeVideoPreview()
  revokeCoverPreview()
  revokePlayerIconPreview()
})

useSeoMeta({
  title: '提交影片',
  description: '向光影提交你的影片，等待审核后公开放映。',
})
</script>

<template>
  <div class="page upload-page">
    <div class="container">
      <header class="upload-head">
        <div>
          <span class="eyebrow">SUBMIT A FILM · 提交影片</span>
          <h1 class="upload-title">把一束光<br>交给银幕。</h1>
          <p>上传视频文件，或提交外部视频地址。普通用户提交后需管理员审核。</p>
        </div>
        <ol class="upload-steps">
          <li><span>01</span>选择片源</li>
          <li><span>02</span>补充信息</li>
          <li><span>03</span>提交审核</li>
        </ol>
      </header>

      <div v-if="!canUpload" class="permission-gate panel">
        <span class="gate-icon"><AppIcon name="lock" :size="22" /></span>
        <div>
          <h2>还没有上传权限</h2>
          <p>上传权限由管理员按账户开通。你可以先联系管理员，或继续浏览、收藏和评论影片。</p>
          <div class="gate-actions">
            <NuxtLink class="btn btn-primary btn-sm" to="/account">查看账户状态</NuxtLink>
            <NuxtLink class="btn btn-ghost btn-sm" to="/videos">去片库看看</NuxtLink>
          </div>
        </div>
      </div>

      <form v-else class="upload-layout" @submit.prevent="submit">
        <div class="upload-form-col">
          <section class="form-section panel">
            <header class="form-section-head">
              <span class="form-step">01</span>
              <div>
                <h2>选择片源</h2>
                <p>站内直传需要对象存储已配置；也可以使用外部视频链接。</p>
              </div>
            </header>

            <div class="mode-switch">
              <button type="button" :class="{ 'is-active': mode === 'upload' }" @click="switchMode('upload')">
                <AppIcon name="upload" :size="15" />
                上传视频文件
              </button>
              <button type="button" :class="{ 'is-active': mode === 'external' }" @click="switchMode('external')">
                <AppIcon name="external" :size="15" />
                外部视频链接
              </button>
            </div>

            <template v-if="mode === 'upload'">
              <div
                class="dropzone"
                :class="{ 'is-active': dragActive, 'has-file': videoFile }"
                role="button"
                tabindex="0"
                @click="videoInput?.click()"
                @keydown.enter="videoInput?.click()"
                @dragover.prevent="dragActive = true"
                @dragleave.prevent="dragActive = false"
                @drop.prevent="onDrop"
              >
                <input ref="videoInput" class="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg" @change="onVideoInput">
                <span class="dropzone-icon"><AppIcon :name="videoFile ? 'check' : 'upload'" :size="24" /></span>
                <template v-if="videoFile">
                  <strong>{{ videoFile.name }}</strong>
                  <span>{{ formatBytes(videoFile.size) }} · 点击可更换文件</span>
                </template>
                <template v-else>
                  <strong>拖入视频，或点击选择</strong>
                  <span>支持 MP4 / WebM / MOV / M4V / OGG，最大 {{ formatBytes(maxVideoSize) }}</span>
                </template>
              </div>

              <div class="cover-upload-row">
                <div class="cover-preview">
                  <img v-if="previewCover" :src="previewCover" alt="封面预览">
                  <span v-else class="cover-placeholder"><AppIcon name="image" :size="19" />封面</span>
                </div>
                <div class="cover-copy">
                  <strong>封面图片</strong>
                  <span>建议 16:9，最大 {{ formatBytes(maxImageSize) }}。也可以填写封面 URL。</span>
                  <div class="cover-actions">
                    <button class="btn btn-subtle btn-sm" type="button" @click="coverInput?.click()">
                      <AppIcon name="upload" :size="13" />
                      {{ coverFile ? '更换封面' : '上传封面' }}
                    </button>
                    <button v-if="coverFile || form.coverUrl" class="text-button" type="button" @click="resetCover">移除</button>
                    <input ref="coverInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onCoverInput">
                  </div>
                </div>
              </div>

              <div class="field">
                <label class="field-label" for="cover-url">
                  封面地址
                  <span class="field-label__hint">可选，上传封面后忽略</span>
                </label>
                <input id="cover-url" v-model="form.coverUrl" class="input" type="url" placeholder="https://example.com/cover.jpg">
              </div>
            </template>

            <template v-else>
              <div class="field">
                <label class="field-label" for="video-url">
                  视频地址
                  <span class="required">*</span>
                </label>
                <input id="video-url" v-model="form.videoUrl" class="input" type="url" placeholder="https://example.com/film.mp4" required>
                <span class="field-hint">支持浏览器可直接播放的 MP4 / WebM 地址。提交后仍会经过审核。</span>
              </div>
              <div class="field">
                <label class="field-label" for="external-cover">封面地址</label>
                <input id="external-cover" v-model="form.coverUrl" class="input" type="url" placeholder="https://example.com/cover.jpg">
              </div>
              <div v-if="previewCover" class="cover-banner">
                <img :src="previewCover" alt="封面预览">
                <span>封面预览</span>
              </div>
            </template>

            <template v-if="isAdmin">
            <div class="player-icon-upload-row">
              <div class="player-icon-preview">
                <img v-if="previewPlayerIcon" :src="previewPlayerIcon" alt="播放进度图标预览">
                <span v-else class="player-icon-placeholder"><AppIcon name="spark" :size="18" /></span>
              </div>
              <div class="player-icon-copy">
                <strong>播放进度图标</strong>
                <span>仅管理员可设置。上传后会替换播放进度条上的圆形拖动标志，建议使用透明背景的正方形 PNG / WebP，最大 {{ formatBytes(maxImageSize) }}。</span>
                <div class="cover-actions">
                  <button class="btn btn-subtle btn-sm" type="button" @click="playerIconInput?.click()">
                    <AppIcon name="upload" :size="13" />
                    {{ playerIconFile ? '更换图标' : '上传图标' }}
                  </button>
                  <button v-if="playerIconFile || form.playerIconUrl" class="text-button" type="button" @click="resetPlayerIcon">移除</button>
                  <input ref="playerIconInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onPlayerIconInput">
                </div>
              </div>
            </div>

            <div class="player-icon-presets">
              <button
                v-for="preset in PLAYER_ICON_PRESETS"
                :key="preset.key"
                type="button"
                class="player-icon-preset"
                :class="{ 'is-active': form.playerIconUrl === preset.url && !playerIconFile }"
                @click="selectPlayerIconPreset(preset.url)"
              >
                <img :src="preset.url" :alt="preset.label">
                <span>{{ preset.label }}</span>
              </button>
            </div>

            <div class="field">
              <label class="field-label" for="player-icon-url">
                自定义进度图标地址
                <span class="field-label__hint">可选，上传图标或选择预设后忽略</span>
              </label>
              <input id="player-icon-url" v-model="form.playerIconUrl" class="input" type="text" inputmode="url" placeholder="https://example.com/progress-icon.png">
            </div>
            </template>
          </section>

          <section class="form-section panel">
            <header class="form-section-head">
              <span class="form-step">02</span>
              <div>
                <h2>补充影片信息</h2>
                <p>标题和简介会出现在片库与详情页。</p>
              </div>
            </header>

            <div class="field">
              <label class="field-label" for="video-title">影片标题 <span class="required">*</span></label>
              <input id="video-title" v-model="form.title" class="input" maxlength="200" placeholder="给这支影片一个名字" required>
            </div>

            <div class="field">
              <label class="field-label" for="video-description">
                影片简介
                <span class="field-label__hint">最多 5000 字</span>
              </label>
              <textarea id="video-description" v-model="form.description" class="textarea" rows="5" maxlength="5000" placeholder="讲讲这支影片，或留下观看提示…" />
            </div>

            <div class="form-row">
              <div class="field">
                <label class="field-label" for="video-category">分类</label>
                <select id="video-category" v-model="form.categoryId" class="select">
                  <option value="">不设置分类</option>
                  <option v-for="category in categories" :key="category.id" :value="String(category.id)">{{ category.name }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label" for="video-duration">时长（秒）</label>
                <input id="video-duration" v-model.number="form.duration" class="input" type="number" min="0" max="86400" step="1">
              </div>
            </div>

            <div class="field">
              <label class="field-label">
                标签
                <span class="field-label__hint">最多选择 10 个</span>
              </label>
              <div class="tag-picker">
                <button
                  v-for="tag in tags"
                  :key="tag.id"
                  class="chip"
                  :class="{ 'is-active': selectedTags.includes(tag.id) }"
                  type="button"
                  @click="toggleTag(tag.id)"
                >
                  #{{ tag.name }}
                </button>
                <span v-if="!tags.length" class="field-hint">管理员还没有创建标签。</span>
              </div>
            </div>
          </section>

          <div v-if="submitting" class="upload-progress panel">
            <div class="progress-head">
              <span><AppIcon name="upload" :size="15" /> 正在上传并提交</span>
              <strong>{{ uploadPercent }}%</strong>
            </div>
            <div class="progress-track"><i :style="{ width: `${uploadPercent}%` }" /></div>
          </div>

          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

          <div class="submit-bar">
            <div class="submit-note">
              <AppIcon name="info" :size="14" />
              <span>提交后进入审核状态，管理员通过后会在片库公开放映。</span>
            </div>
            <button class="btn btn-primary btn-lg" type="submit" :disabled="submitting || !canSubmit">
              <span v-if="submitting" class="spinner" />
              <AppIcon v-else name="film" :size="16" />
              {{ submitting ? '正在提交…' : '提交影片' }}
            </button>
          </div>
        </div>

        <aside class="preview-col">
          <div class="preview-sticky">
            <div class="preview-label">
              <span>SUBMISSION PREVIEW</span>
              <AppIcon name="eye" :size="14" />
            </div>
            <div class="preview-poster" :class="{ 'is-empty': !previewCover }">
              <img v-if="previewCover" :src="previewCover" alt="影片封面预览">
              <span v-else class="poster-empty">
                <AppIcon name="image" :size="26" />
                等待封面
              </span>
              <span v-if="form.duration" class="preview-duration">{{ formatDuration(form.duration) }}</span>
            </div>
            <div class="preview-copy">
              <span class="preview-category">{{ selectedCategory?.name || '未分类' }}</span>
              <h3>{{ form.title.trim() || '未命名影片' }}</h3>
              <p>{{ form.description.trim().slice(0, 120) || '影片简介会出现在这里。' }}{{ form.description.length > 120 ? '…' : '' }}</p>
              <div v-if="previewTags.length" class="preview-tags">
                <span v-for="tag in previewTags" :key="tag.id" class="tag">#{{ tag.name }}</span>
              </div>
            </div>
            <div class="preview-facts">
              <span>{{ mode === 'upload' ? '站内上传' : '外部链接' }}</span>
              <span>{{ form.duration ? formatDuration(form.duration) : '时长待定' }}</span>
              <span>待审核</span>
            </div>
            <div v-if="previewPlayerIcon" class="preview-progress-icon">
              <span>播放进度图标</span>
              <img :src="previewPlayerIcon" alt="播放进度图标预览">
            </div>
            <div class="preview-hint">
              <AppIcon name="info" :size="13" />
              这是前台展示效果预览，实际以审核通过后的页面为准。
            </div>
          </div>
        </aside>
      </form>
    </div>
  </div>
</template>

<style scoped>
.upload-page {
  padding-top: clamp(30px, 4vw, 54px);
}

.upload-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--line);
}
.upload-head > div {
  display: grid;
  gap: 12px;
}
.upload-title {
  font-family: var(--font-display);
  font-size: clamp(44px, 6vw, 74px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 0.98;
}
.upload-head p {
  max-width: 500px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.75;
}
.upload-steps {
  display: flex;
  flex: 0 0 auto;
  gap: 18px;
  padding-bottom: 8px;
}
.upload-steps li {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.06em;
}
.upload-steps span {
  color: var(--amber);
}

.permission-gate {
  display: flex;
  gap: 18px;
  margin-top: 28px;
  padding: 28px;
}
.gate-icon {
  display: grid;
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(243, 184, 95, 0.22);
  border-radius: 50%;
  color: var(--amber);
  background: var(--amber-soft);
}
.permission-gate h2 {
  margin-bottom: 6px;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
}
.permission-gate p {
  max-width: 520px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.75;
}
.gate-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.upload-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: clamp(24px, 3.5vw, 46px);
  align-items: start;
  margin-top: 30px;
}

.upload-form-col {
  display: grid;
  gap: 17px;
}

.form-section {
  padding: 24px;
}
.form-section-head {
  display: flex;
  gap: 13px;
  margin-bottom: 21px;
}
.form-step {
  color: var(--amber);
  font-family: var(--font-display);
  font-size: 27px;
  line-height: 1;
}
.form-section-head h2 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.form-section-head p {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.6;
}

.mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 17px;
}
.mode-switch button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 13px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: transparent;
  font-size: 10.5px;
  cursor: pointer;
  transition: 160ms ease;
}
.mode-switch button:hover {
  color: var(--ink);
  border-color: var(--line-strong);
}
.mode-switch button.is-active {
  color: var(--amber-bright);
  border-color: rgba(243, 184, 95, 0.34);
  background: var(--amber-soft);
}

.dropzone {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 35px 20px;
  border: 1px dashed var(--line-strong);
  border-radius: 14px;
  color: var(--muted);
  background: rgba(6, 7, 10, 0.35);
  text-align: center;
  cursor: pointer;
  transition: 180ms ease;
}
.dropzone:hover,
.dropzone.is-active {
  border-color: rgba(243, 184, 95, 0.52);
  background: rgba(243, 184, 95, 0.04);
}
.dropzone.has-file {
  border-style: solid;
  border-color: rgba(146, 214, 164, 0.28);
  background: rgba(146, 214, 164, 0.04);
}
.dropzone-icon {
  display: grid;
  width: 49px;
  height: 49px;
  margin-bottom: 6px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--amber);
  background: var(--amber-soft);
}
.dropzone strong {
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 600;
}
.dropzone span:last-child {
  color: var(--muted-weak);
  font-size: 9.5px;
}

.cover-upload-row {
  display: flex;
  align-items: center;
  gap: 13px;
  margin: 17px 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.cover-preview {
  width: 104px;
  height: 62px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-2);
}
.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  display: grid;
  height: 100%;
  place-items: center;
  gap: 2px;
  color: var(--muted-weak);
  font-size: 8px;
}
.cover-copy {
  display: grid;
  flex: 1;
  gap: 3px;
}
.cover-copy strong {
  font-size: 11px;
}
.cover-copy span {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.5;
}
.cover-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.cover-banner {
  position: relative;
  overflow: hidden;
  height: 160px;
  margin-top: 15px;
  border: 1px solid var(--line);
  border-radius: 11px;
}
.cover-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.7);
}
.cover-banner span {
  position: absolute;
  bottom: 12px;
  left: 13px;
  color: var(--ink-soft);
  font-size: 9px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 0.6fr;
  gap: 12px;
}
.tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.tag-picker .chip {
  min-height: 29px;
  padding: 0 11px;
  font-size: 10.5px;
}
.required {
  color: var(--amber);
}

.player-icon-upload-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
}
.player-icon-preview {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-2);
}
.player-icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 5px;
}
.player-icon-placeholder {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid rgba(243, 184, 95, 0.3);
  border-radius: 50%;
  color: var(--amber-bright);
  background: rgba(243, 184, 95, 0.1);
}
.player-icon-presets {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 7px;
  margin: 2px 0 1px;
}
.player-icon-preset {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 5px;
  padding: 7px 4px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.025);
  font-size: 8px;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, transform 180ms var(--ease-out);
}
.player-icon-preset img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.player-icon-preset:hover {
  border-color: var(--line-strong);
  transform: translateY(-2px);
}
.player-icon-preset.is-active {
  border-color: rgba(169, 103, 22, 0.45);
  color: var(--amber-bright);
  background: rgba(169, 103, 22, 0.08);
}
.player-icon-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.player-icon-copy strong {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
}
.player-icon-copy > span {
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.7;
}
.preview-progress-icon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0 0;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 9px;
}
.preview-progress-icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.upload-progress {
  padding: 17px 18px;
}
.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
  color: var(--ink-soft);
  font-size: 11px;
}
.progress-head span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.progress-head :deep(svg) {
  color: var(--amber);
}
.progress-head strong {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 11px;
}
.progress-track {
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--surface-3);
}
.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--amber), var(--coral));
  transition: width 280ms ease;
}

.submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 6px 0 20px;
}
.submit-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  max-width: 380px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.6;
}
.submit-note :deep(svg) {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--muted-weak);
}

.preview-col {
  min-width: 0;
}
.preview-sticky {
  position: sticky;
  top: calc(var(--header-height) + 28px);
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(150deg, rgba(243, 184, 95, 0.045), transparent 40%),
    rgba(15, 18, 24, 0.52);
}
.preview-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 13px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}
.preview-poster {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 5;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--surface-2);
}
.preview-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-poster.is-empty {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 70% 20%, rgba(243, 184, 95, 0.12), transparent 52%),
    linear-gradient(150deg, #1a1d24, #0b0d12);
}
.poster-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  color: var(--muted-weak);
  font-size: 9px;
}
.preview-duration {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--ink-soft);
  background: rgba(5, 6, 9, 0.7);
  font-family: var(--font-mono);
  font-size: 9px;
}
.preview-copy {
  display: grid;
  gap: 6px;
  padding: 16px 2px 13px;
}
.preview-category {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
}
.preview-copy h3 {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-copy p {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.65;
}
.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 3px;
}
.preview-facts {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}
.preview-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-top: 12px;
  color: var(--muted-weak);
  font-size: 9px;
  line-height: 1.6;
}
.preview-hint :deep(svg) {
  flex: 0 0 auto;
  margin-top: 1px;
}

@media (max-width: 1040px) {
  .upload-layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
}

@media (max-width: 860px) {
  .upload-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
  .upload-steps {
    padding-bottom: 0;
  }
  .upload-layout {
    grid-template-columns: 1fr;
  }
  .preview-sticky {
    position: static;
  }
  .preview-poster {
    aspect-ratio: 16 / 8;
  }
}

@media (max-width: 620px) {
  .player-icon-presets {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .form-section {
    padding: 18px;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .cover-upload-row {
    align-items: flex-start;
    flex-direction: column;
  }
  .submit-bar {
    align-items: stretch;
    flex-direction: column;
  }
  .submit-bar .btn {
    width: 100%;
  }
  .upload-steps {
    flex-wrap: wrap;
    gap: 9px 14px;
  }
}
</style>
