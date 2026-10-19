<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Danmaku, DanmakuMode } from '~/types'
import { usePlayerPreferences, type PlayerSkin } from '~/composables/usePlayerPreferences'

const props = withDefaults(defineProps<{
  videoId: number
  src: string | null
  poster?: string | null
  progressIcon?: string | null
  title: string
  autoplay?: boolean
}>(), {
  poster: null,
  progressIcon: null,
  autoplay: false,
})

const emit = defineEmits<{
  play: []
  pause: []
  ended: []
  timeupdate: [currentTime: number, duration: number]
}>()

interface DanmakuLayerInstance {
  playNow: (item: Danmaku) => void
  reset: (time?: number) => void
}

const auth = useAuth()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const videoApi = useVideoApi()
const { prefs, load: loadPreferences } = usePlayerPreferences()

const shellEl = ref<HTMLDivElement | null>(null)
const stageEl = ref<HTMLDivElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const progressEl = ref<HTMLDivElement | null>(null)
const settingsRef = ref<HTMLDivElement | null>(null)
const composerInput = ref<HTMLInputElement | null>(null)
const danmakuLayerRef = ref<DanmakuLayerInstance | null>(null)

const started = ref(false)
const playing = ref(false)
const ended = ref(false)
const waiting = ref(false)
const failed = ref(false)
const isFullscreen = ref(false)
const isPip = ref(false)
const pipSupported = ref(false)
const fullscreenSupported = ref(true)
const controlsVisible = ref(false)
const settingsOpen = ref(false)
const composerFocused = ref(false)
const composerOpen = ref(false)
const seeking = ref(false)
const hoverTime = ref<number | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const buffered = ref(0)
const danmakuText = ref('')
const sending = ref(false)
const danmakuList = ref<Danmaku[]>([])
const danmakuLoading = ref(false)
const danmakuError = ref(false)
const progressIconError = ref(false)
const isMobile = ref(false)

let hideTimer: ReturnType<typeof setTimeout> | null = null
let frame: number | null = null
let lastStageTapAt = 0
let lastStageTapX = 0
let lastStageTapY = 0
let mobileQuery: MediaQueryList | null = null

const user = auth.user
const canSendDanmaku = computed(() => Boolean(user.value))
const progressPercent = computed(() => duration.value > 0
  ? Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
  : 0)
const bufferedPercent = computed(() => duration.value > 0
  ? Math.min(100, Math.max(0, (buffered.value / duration.value) * 100))
  : 0)
const hoverPercent = computed(() => (
  hoverTime.value !== null && duration.value > 0
    ? Math.min(100, (hoverTime.value / duration.value) * 100)
    : 0
))
const showPoster = computed(() => Boolean(props.src) && !started.value && !failed.value)
const showCenterPlay = computed(() => Boolean(props.src) && started.value && !playing.value && !failed.value)
const rateLabel = computed(() => `${Number(prefs.rate.toFixed(2))}x`)
const volumeIcon = computed(() => prefs.muted || prefs.volume === 0 ? 'mute' : 'volume')
const hasProgressIcon = computed(() => Boolean(props.progressIcon) && !progressIconError.value)
// Danmaku only needs ~10 decisions per second; the progress bar itself updates every frame.
const danmakuClock = computed(() => Math.round(currentTime.value * 10) / 10)
const skinVars = computed<Record<string, string>>(() => {
  const palette = {
    amber: { accent: '#f3b85f', ink: '#171208', rgb: '243, 184, 95' },
    ivory: { accent: '#f3efe4', ink: '#171208', rgb: '243, 239, 228' },
    neon: { accent: '#7ef0c0', ink: '#0d1913', rgb: '126, 240, 192' },
    crimson: { accent: '#ff9a8f', ink: '#22100d', rgb: '255, 154, 143' },
  }[prefs.skin]
  return {
    '--pa': palette.accent,
    '--pa-ink': palette.ink,
    '--pa-rgb': palette.rgb,
  }
})
const danmakuMarkers = computed(() => {
  if (!duration.value) return []
  return danmakuList.value
    .filter(item => item.time <= duration.value)
    .slice(0, 100)
    .map(item => ({
      id: item.id,
      left: `${Math.min(100, (item.time / duration.value) * 100)}%`,
    }))
})

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
const seekSteps = [5, 10, 15, 30]
const skins: Array<{ key: PlayerSkin; label: string; color: string }> = [
  { key: 'amber', label: '琥珀', color: '#f3b85f' },
  { key: 'ivory', label: '月白', color: '#f3efe4' },
  { key: 'neon', label: '霓虹', color: '#7ef0c0' },
  { key: 'crimson', label: '胶片红', color: '#ff9a8f' },
]
const danmakuColors = ['#f3efe4', '#ffd28c', '#ff9f9a', '#8fd6ff', '#a8e6b0']
const danmakuModes: Array<{ key: DanmakuMode; label: string }> = [
  { key: 'SCROLL', label: '滚动' },
  { key: 'TOP', label: '顶部' },
  { key: 'BOTTOM', label: '底部' },
]

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

function applyPreferences() {
  const element = videoEl.value
  if (!element) return
  element.volume = prefs.volume
  element.muted = prefs.muted
  element.playbackRate = prefs.rate
}

function startClock() {
  stopClock()
  const tick = () => {
    const element = videoEl.value
    if (!element) {
      frame = null
      return
    }
    if (!element.paused) {
      // Direct rAF sampling keeps the timeline and its moving thumb smooth.
      currentTime.value = element.currentTime
      if (element.buffered.length) {
        buffered.value = element.buffered.end(element.buffered.length - 1)
      }
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

function stopClock() {
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
}

async function play() {
  const element = videoEl.value
  if (!element || !props.src) return
  ended.value = false
  try {
    await element.play()
  } catch {
    started.value = false
  }
}

function togglePlay() {
  const element = videoEl.value
  if (!element || !props.src) return
  if (element.paused || element.ended) {
    if (element.ended) {
      element.currentTime = 0
      currentTime.value = 0
      ended.value = false
    }
    void play()
  } else {
    element.pause()
  }
}

const interactiveStageSelector = [
  '.player-controls',
  '.player-settings-panel',
  '.player-settings-backdrop',
  '.danmaku-composer',
  '.player-overlay',
  '.center-play',
  '.player-state-btn',
  'button',
  'input',
  'textarea',
  'select',
  'a',
].join(',')

function isPlayerInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(interactiveStageSelector))
}

function onStagePointerUp(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (isPlayerInteractiveTarget(event.target)) return

  // A single click only reveals the controls. Play/pause requires a double tap/click,
  // the dedicated play buttons, or the centered play overlay.
  const now = performance.now()
  const dx = event.clientX - lastStageTapX
  const dy = event.clientY - lastStageTapY
  const isDoubleTap = lastStageTapAt > 0
    && now - lastStageTapAt <= 340
    && Math.hypot(dx, dy) <= 30

  if (isDoubleTap) {
    lastStageTapAt = 0
    togglePlay()
    return
  }

  lastStageTapAt = now
  lastStageTapX = event.clientX
  lastStageTapY = event.clientY
  shellEl.value?.focus({ preventScroll: true })
  bumpControls()
}

function onPlay() {
  started.value = true
  playing.value = true
  ended.value = false
  failed.value = false
  waiting.value = false
  emit('play')
  bumpControls()
  startClock()
}

function onPause() {
  playing.value = false
  stopClock()
  if (videoEl.value) currentTime.value = videoEl.value.currentTime
  emit('pause')
  showControls(false)
}

function onEnded() {
  playing.value = false
  ended.value = true
  stopClock()
  if (videoEl.value) currentTime.value = videoEl.value.duration || currentTime.value
  emit('ended')
  showControls(false)
}

function onTimeUpdate() {
  const element = videoEl.value
  if (!element) return
  currentTime.value = element.currentTime || 0
  duration.value = element.duration || duration.value
  emit('timeupdate', currentTime.value, duration.value)
}

function onLoadedMetadata() {
  const element = videoEl.value
  if (!element) return
  duration.value = element.duration || 0
  applyPreferences()
  if (element.buffered.length) {
    buffered.value = element.buffered.end(element.buffered.length - 1)
  }
}

function onProgress() {
  const element = videoEl.value
  if (!element || !element.buffered.length) return
  buffered.value = element.buffered.end(element.buffered.length - 1)
}

function onWaiting() {
  waiting.value = true
}

function onPlaying() {
  waiting.value = false
}

function onVolumeChange() {
  const element = videoEl.value
  if (!element) return
  prefs.volume = element.volume
  prefs.muted = element.muted
}

function setVolume(value: number) {
  const next = Math.min(1, Math.max(0, value))
  prefs.volume = next
  prefs.muted = next === 0
  if (videoEl.value) {
    videoEl.value.volume = next
    videoEl.value.muted = next === 0
  }
}

function onVolumeInput(event: Event) {
  setVolume((event.target as HTMLInputElement).valueAsNumber)
}

function toggleMute() {
  if (prefs.muted || prefs.volume === 0) {
    prefs.muted = false
    if (prefs.volume === 0) setVolume(0.6)
  } else {
    prefs.muted = true
  }
}

function setRate(rate: number) {
  prefs.rate = rate
  if (videoEl.value) videoEl.value.playbackRate = rate
}

function seekTo(time: number) {
  const element = videoEl.value
  if (!element) return
  const max = duration.value || element.duration || 0
  const next = Math.min(Math.max(0, time), max || time)
  element.currentTime = next
  currentTime.value = next
  danmakuLayerRef.value?.reset(next)
  ended.value = false
}

function seekFromClientX(clientX: number) {
  if (!progressEl.value || !duration.value) return
  const rect = progressEl.value.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  seekTo(ratio * duration.value)
}

function onProgressDown(event: PointerEvent) {
  if (!duration.value) return
  seeking.value = true
  seekFromClientX(event.clientX)
  window.addEventListener('pointermove', onSeekMove)
  window.addEventListener('pointerup', endSeek, { once: true })
  window.addEventListener('pointercancel', endSeek, { once: true })
}

function onSeekMove(event: PointerEvent) {
  if (!seeking.value) return
  seekFromClientX(event.clientX)
}

function endSeek() {
  seeking.value = false
  window.removeEventListener('pointermove', onSeekMove)
  window.removeEventListener('pointerup', endSeek)
  window.removeEventListener('pointercancel', endSeek)
}

function onProgressHover(event: PointerEvent) {
  if (!progressEl.value || !duration.value) return
  const rect = progressEl.value.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  hoverTime.value = ratio * duration.value
}

function onProgressLeave() {
  hoverTime.value = null
}

function showControls(schedule = true) {
  controlsVisible.value = true
  if (hideTimer) clearTimeout(hideTimer)
  if (schedule && playing.value && !settingsOpen.value && !composerFocused.value) {
    hideTimer = setTimeout(() => {
      if (playing.value && !settingsOpen.value && !composerFocused.value) {
        controlsVisible.value = false
      }
    }, 2800)
  }
}

function bumpControls() {
  showControls()
}

function onStageLeave() {
  if (playing.value && !settingsOpen.value && !composerFocused.value) {
    controlsVisible.value = false
  }
}

function toggleDanmaku() {
  prefs.danmakuEnabled = !prefs.danmakuEnabled
  if (prefs.danmakuEnabled) danmakuLayerRef.value?.reset()
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value
  if (settingsOpen.value) showControls(false)
  else showControls()
}

function closeSettings() {
  settingsOpen.value = false
  showControls()
}

function setSkin(skin: PlayerSkin) {
  prefs.skin = skin
}

function setDanmakuMode(mode: DanmakuMode) {
  prefs.danmakuMode = mode
}

function requireLoginForDanmaku() {
  if (user.value) return true
  toast.info('登录后即可发送弹幕')
  void router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}

function onComposerFocus(event: FocusEvent) {
  if (!requireLoginForDanmaku()) {
    ;(event.target as HTMLInputElement).blur()
    return
  }
  composerOpen.value = true
  composerFocused.value = true
  showControls(false)
}

function openComposer() {
  if (!requireLoginForDanmaku()) return
  composerOpen.value = true
  showControls(false)
  void nextTick(() => composerInput.value?.focus())
}

function onComposerBlur() {
  composerFocused.value = false
  showControls()
}

async function sendDanmaku() {
  const content = danmakuText.value.trim()
  if (!content || sending.value || !requireLoginForDanmaku()) return
  sending.value = true
  try {
    const result = await videoApi.createDanmaku(props.videoId, {
      content: content.slice(0, 80),
      timeSeconds: Math.min(
        Math.max(currentTime.value, 0) + 0.15,
        Math.max(duration.value, currentTime.value + 0.15),
      ),
      mode: prefs.danmakuMode,
      color: prefs.danmakuColor,
    })
    danmakuList.value.push(result)
    danmakuText.value = ''
    composerOpen.value = false
    if (playing.value) danmakuLayerRef.value?.playNow(result)
    toast.success('弹幕已发送')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : '弹幕发送失败')
  } finally {
    sending.value = false
  }
}

async function loadDanmaku() {
  const videoId = props.videoId
  if (!videoId) return
  danmakuLoading.value = true
  danmakuError.value = false
  try {
    const result = await videoApi.listDanmaku(videoId)
    if (videoId === props.videoId) danmakuList.value = result.items
  } catch {
    if (videoId === props.videoId) {
      danmakuList.value = []
      danmakuError.value = true
    }
  } finally {
    if (videoId === props.videoId) danmakuLoading.value = false
  }
}

async function toggleFullscreen() {
  if (!stageEl.value) return
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else if (stageEl.value.requestFullscreen) {
      await stageEl.value.requestFullscreen()
    } else {
      const video = videoEl.value as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
      video?.webkitEnterFullscreen?.()
    }
  } catch {
    toast.error('当前浏览器不支持全屏播放')
  }
}

async function togglePip() {
  const element = videoEl.value
  if (!element) return
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else if (document.pictureInPictureEnabled) {
      await element.requestPictureInPicture()
    }
  } catch {
    toast.error('当前浏览器不支持画中画')
  }
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(stageEl.value && document.fullscreenElement === stageEl.value)
  showControls()
}

function onEnterPip() {
  isPip.value = true
}

function onLeavePip() {
  isPip.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && settingsOpen.value) {
    event.preventDefault()
    closeSettings()
    return
  }
  // The settings panel owns arrow keys for scrolling while it is open.
  if (settingsOpen.value) return

  const target = event.target as HTMLElement | null
  if (target && (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)
  )) return

  const key = event.key.toLowerCase()
  if (key === ' ' || key === 'spacebar' || key === 'k') {
    event.preventDefault()
    togglePlay()
  } else if (key === 'arrowleft') {
    event.preventDefault()
    seekTo(currentTime.value - prefs.seekStep)
  } else if (key === 'arrowright') {
    event.preventDefault()
    seekTo(currentTime.value + prefs.seekStep)
  } else if (key === 'arrowup') {
    event.preventDefault()
    setVolume(prefs.volume + 0.05)
  } else if (key === 'arrowdown') {
    event.preventDefault()
    setVolume(prefs.volume - 0.05)
  } else if (key === 'm') {
    event.preventDefault()
    toggleMute()
  } else if (key === 'f') {
    event.preventDefault()
    void toggleFullscreen()
  } else if (key === 'd') {
    event.preventDefault()
    toggleDanmaku()
  } else if (key === 'escape' && settingsOpen.value) {
    closeSettings()
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!settingsOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (settingsRef.value?.contains(target)) return
  if (target instanceof Element && target.closest('.player-settings-btn')) return
  closeSettings()
}

function resetPlayer() {
  started.value = false
  playing.value = false
  ended.value = false
  waiting.value = false
  failed.value = false
  currentTime.value = 0
  duration.value = 0
  buffered.value = 0
  danmakuText.value = ''
  composerOpen.value = false
  danmakuList.value = []
  danmakuError.value = false
  progressIconError.value = false
  settingsOpen.value = false
  hoverTime.value = null
  danmakuLayerRef.value?.reset()
  stopClock()
}

watch(() => props.videoId, () => {
  resetPlayer()
  void loadDanmaku()
})

watch(() => props.src, async () => {
  resetPlayer()
  await nextTick()
  videoEl.value?.load()
})

watch(() => props.progressIcon, () => {
  progressIconError.value = false
})

watch(() => prefs.volume, (value) => {
  if (videoEl.value) videoEl.value.volume = value
})

watch(() => prefs.muted, (value) => {
  if (videoEl.value) videoEl.value.muted = value
})

watch(() => prefs.rate, (value) => {
  if (videoEl.value) videoEl.value.playbackRate = value
})

watch(settingsOpen, (open) => {
  if (open) showControls(false)
  else showControls()
})

onMounted(() => {
  loadPreferences()
  applyPreferences()
  pipSupported.value = typeof document !== 'undefined' && document.pictureInPictureEnabled
  fullscreenSupported.value = Boolean(stageEl.value?.requestFullscreen)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  mobileQuery = window.matchMedia('(max-width: 760px)')
  isMobile.value = mobileQuery.matches
  mobileQuery.addEventListener('change', onMobileChange)
  void loadDanmaku()
  if (props.autoplay) void play()
})

onBeforeUnmount(() => {
  stopClock()
  if (hideTimer) clearTimeout(hideTimer)
  endSeek()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  mobileQuery?.removeEventListener('change', onMobileChange)
  mobileQuery = null
})

function onMobileChange(event: MediaQueryListEvent) {
  isMobile.value = event.matches
}

defineExpose({ play })
</script>

<template>
  <div
    ref="shellEl"
    class="player-shell"
    :class="[`skin-${prefs.skin}`, { 'is-fullscreen': isFullscreen }]"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div
      ref="stageEl"
      class="player-stage"
      :class="{ 'is-idle': !controlsVisible, 'is-seeking': seeking, 'settings-open': settingsOpen }"
      @pointerup="onStagePointerUp"
      @pointermove="bumpControls"
      @pointerleave="onStageLeave"
    >
      <video
        v-if="src"
        ref="videoEl"
        class="player-video"
        :src="src"
        :poster="poster || undefined"
        playsinline
        preload="metadata"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @progress="onProgress"
        @waiting="onWaiting"
        @playing="onPlaying"
        @error="failed = true"
        @volumechange="onVolumeChange"
        @enterpictureinpicture="onEnterPip"
        @leavepictureinpicture="onLeavePip"
      />

      <DanmakuLayer
        v-if="prefs.danmakuEnabled"
        ref="danmakuLayerRef"
        :items="danmakuList"
        :current-time="danmakuClock"
        :playing="playing"
        :enabled="prefs.danmakuEnabled"
        :opacity="prefs.danmakuOpacity"
        :font-size="prefs.danmakuFontSize"
        :area="prefs.danmakuArea"
      />

      <div class="player-top" :class="{ 'is-visible': controlsVisible }">
        <div>
          <span class="player-kicker">NOW PLAYING{{ danmakuError ? ' · DANMAKU OFFLINE' : '' }}</span>
          <strong>{{ title }}</strong>
        </div>
        <span v-if="danmakuLoading" class="player-top-loading">弹幕载入中</span>
      </div>

      <Transition name="player-fade">
        <button
          v-if="showPoster"
          class="player-overlay"
          type="button"
          :aria-label="`播放 ${title}`"
          @click="togglePlay"
        >
          <img v-if="poster" class="overlay-poster" :src="poster" :alt="title">
          <div class="overlay-veil" />
          <span class="overlay-glyph">
            <PlayerIcon name="play" :size="46" />
          </span>
          <span class="overlay-caption">PLAY FILM</span>
        </button>
      </Transition>

      <button
        v-if="showCenterPlay"
        class="center-play"
        type="button"
        :aria-label="`继续播放 ${title}`"
        @click="togglePlay"
      >
        <PlayerIcon name="play" :size="30" />
      </button>

      <div v-if="waiting && started" class="player-spinner" aria-label="正在缓冲"><i /></div>

      <div v-if="!src" class="player-state">
        <PlayerIcon name="danmakuOff" :size="28" />
        <strong>播放地址尚未就绪</strong>
        <span>该影片可能仍在处理中，请稍后再来。</span>
      </div>

      <div v-else-if="failed" class="player-state">
        <PlayerIcon name="replay" :size="28" />
        <strong>无法播放这支影片</strong>
        <span>播放地址可能已过期，刷新页面后再试。</span>
        <button class="player-state-btn" type="button" @click="() => { failed = false; play() }">重新加载</button>
      </div>

      <div class="player-controls" :class="{ 'is-visible': controlsVisible }">
        <Teleport to="body" :disabled="!isMobile">
          <div
            v-if="settingsOpen && isMobile"
            class="player-settings-backdrop"
            @click="closeSettings"
          />
          <Transition name="player-settings">
          <div
            v-if="settingsOpen"
            ref="settingsRef"
            class="player-settings-panel"
            :class="{ 'is-mobile': isMobile }"
            :style="skinVars"
            @click.stop
          >
            <div class="settings-head">
              <span>PLAYER SETTINGS</span>
              <button type="button" class="player-icon-btn" aria-label="关闭设置" @click="closeSettings">
                <PlayerIcon name="close" :size="15" />
              </button>
            </div>

            <section class="settings-section">
              <span class="settings-label">播放速度</span>
              <div class="settings-options">
                <button
                  v-for="speed in speeds"
                  :key="speed"
                  type="button"
                  class="settings-option"
                  :class="{ 'is-active': prefs.rate === speed }"
                  @click="setRate(speed)"
                >
                  {{ speed }}x
                </button>
              </div>
            </section>

            <section class="settings-section">
              <div class="settings-row">
                <span class="settings-label">弹幕显示</span>
                <button
                  type="button"
                  class="settings-switch"
                  :class="{ 'is-on': prefs.danmakuEnabled }"
                  :aria-pressed="prefs.danmakuEnabled"
                  @click="toggleDanmaku"
                >
                  <i />
                </button>
              </div>
              <label class="settings-range">
                <span>透明度</span>
                <input v-model.number="prefs.danmakuOpacity" type="range" min="0.25" max="1" step="0.05">
                <em>{{ Math.round(prefs.danmakuOpacity * 100) }}%</em>
              </label>
              <div class="settings-row settings-row--wrap">
                <span class="settings-label">字号</span>
                <div class="settings-options settings-options--compact">
                  <button
                    v-for="size in [14, 18, 22]"
                    :key="size"
                    type="button"
                    class="settings-option"
                    :class="{ 'is-active': prefs.danmakuFontSize === size }"
                    @click="prefs.danmakuFontSize = size"
                  >
                    {{ size }}
                  </button>
                </div>
              </div>
              <div class="settings-row settings-row--wrap">
                <span class="settings-label">显示区域</span>
                <div class="settings-options settings-options--compact">
                  <button
                    v-for="area in [{ value: 0.3, label: '1/4' }, { value: 0.6, label: '1/2' }, { value: 0.9, label: '3/4' }]"
                    :key="area.value"
                    type="button"
                    class="settings-option"
                    :class="{ 'is-active': prefs.danmakuArea === area.value }"
                    @click="prefs.danmakuArea = area.value"
                  >
                    {{ area.label }}
                  </button>
                </div>
              </div>
              <div class="settings-row settings-row--wrap">
                <span class="settings-label">发送位置</span>
                <div class="settings-options settings-options--compact">
                  <button
                    v-for="mode in danmakuModes"
                    :key="mode.key"
                    type="button"
                    class="settings-option"
                    :class="{ 'is-active': prefs.danmakuMode === mode.key }"
                    @click="setDanmakuMode(mode.key)"
                  >
                    {{ mode.label }}
                  </button>
                </div>
              </div>
              <div class="settings-row">
                <span class="settings-label">弹幕颜色</span>
                <div class="settings-colors">
                  <button
                    v-for="color in danmakuColors"
                    :key="color"
                    type="button"
                    class="settings-color"
                    :class="{ 'is-active': prefs.danmakuColor === color }"
                    :style="{ '--dot': color }"
                    :aria-label="`弹幕颜色 ${color}`"
                    @click="prefs.danmakuColor = color"
                  >
                    <i />
                  </button>
                </div>
              </div>
            </section>

            <section v-if="!isMobile" class="settings-section">
              <div class="settings-row settings-row--wrap">
                <span class="settings-label">方向键跳转</span>
                <div class="settings-options settings-options--compact">
                  <button
                    v-for="step in seekSteps"
                    :key="step"
                    type="button"
                    class="settings-option"
                    :class="{ 'is-active': prefs.seekStep === step }"
                    @click="prefs.seekStep = step"
                  >
                    {{ step }}s
                  </button>
                </div>
              </div>
            </section>

            <section class="settings-section">
              <span class="settings-label">播放器主色</span>
              <div class="settings-skins">
                <button
                  v-for="skin in skins"
                  :key="skin.key"
                  type="button"
                  class="skin-swatch"
                  :class="{ 'is-active': prefs.skin === skin.key }"
                  :style="{ '--swatch': skin.color }"
                  :aria-label="skin.label"
                  :title="skin.label"
                  @click="setSkin(skin.key)"
                >
                  <i />
                  <span>{{ skin.label }}</span>
                </button>
              </div>
            </section>

            <div class="settings-hint">空格 播放 · ← → 快退/快进 {{ prefs.seekStep }}s · F 全屏 · D 弹幕</div>
            <button type="button" class="settings-dismiss" @click="closeSettings">
              <PlayerIcon name="chevronDown" :size="14" />
              收起菜单
            </button>
          </div>
          </Transition>
        </Teleport>

        <div v-if="prefs.danmakuEnabled" class="danmaku-composer" :class="{ 'is-open': composerOpen }">
          <div class="composer-modes">
            <button
              v-for="mode in danmakuModes"
              :key="mode.key"
              type="button"
              :class="{ 'is-active': prefs.danmakuMode === mode.key }"
              @click="setDanmakuMode(mode.key)"
            >
              {{ mode.label }}
            </button>
          </div>
          <div class="composer-input-wrap">
            <span class="composer-mark">弹</span>
            <input
              ref="composerInput"
              v-model="danmakuText"
              type="text"
              maxlength="80"
              :placeholder="canSendDanmaku ? '发一条弹幕，和大家一起看' : '登录后发送弹幕'"
              @focus="onComposerFocus"
              @blur="onComposerBlur"
              @keydown.enter.prevent="sendDanmaku"
            >
          </div>
          <div class="composer-colors">
            <button
              v-for="color in danmakuColors"
              :key="color"
              type="button"
              class="composer-color"
              :class="{ 'is-active': prefs.danmakuColor === color }"
              :style="{ '--dot': color }"
              :aria-label="`弹幕颜色 ${color}`"
              @click="prefs.danmakuColor = color"
            >
              <i />
            </button>
          </div>
          <button
            type="button"
            class="composer-send"
            :disabled="!danmakuText.trim() || sending"
            aria-label="发送弹幕"
            @click="sendDanmaku"
          >
            <PlayerIcon :name="sending ? 'settings' : 'send'" :size="16" />
          </button>
        </div>

        <div
          ref="progressEl"
          class="progress-line"
          role="slider"
          tabindex="0"
          :aria-valuemin="0"
          :aria-valuemax="duration"
          :aria-valuenow="currentTime"
          aria-label="播放进度"
          @pointerdown="onProgressDown"
          @pointermove="onProgressHover"
          @pointerleave="onProgressLeave"
          @keydown.left.prevent.stop="seekTo(currentTime - prefs.seekStep)"
          @keydown.right.prevent.stop="seekTo(currentTime + prefs.seekStep)"
          @keydown.home.prevent.stop="seekTo(0)"
          @keydown.end.prevent.stop="seekTo(duration)"
        >
          <div class="progress-rail">
            <span class="progress-buffered" :style="{ width: `${bufferedPercent}%` }" />
            <span class="progress-played" :style="{ transform: `scaleX(${progressPercent / 100})` }" />
            <span
              class="progress-thumb"
              :class="{ 'has-icon': hasProgressIcon }"
              :style="{ left: `${progressPercent}%` }"
            >
              <img
                v-if="hasProgressIcon"
                :src="progressIcon || ''"
                alt=""
                draggable="false"
                @dragstart.prevent
                @error="progressIconError = true"
              >
            </span>
            <span
              v-for="marker in danmakuMarkers"
              :key="marker.id"
              class="danmaku-tick"
              :style="{ left: marker.left }"
            />
            <span v-if="hoverTime !== null" class="progress-hover" :style="{ left: `${hoverPercent}%` }">
              {{ formatTime(hoverTime) }}
            </span>
          </div>
        </div>

        <div class="control-row">
          <button
            type="button"
            class="player-icon-btn player-play-btn"
            :aria-label="playing ? '暂停' : '播放'"
            @click="togglePlay"
          >
            <PlayerIcon :name="playing ? 'pause' : 'play'" :size="19" />
          </button>

          <button type="button" class="player-icon-btn desktop-only" aria-label="后退 10 秒" @click="seekTo(currentTime - 10)">
            <PlayerIcon name="back10" :size="18" />
          </button>
          <button type="button" class="player-icon-btn desktop-only" aria-label="前进 10 秒" @click="seekTo(currentTime + 10)">
            <PlayerIcon name="forward10" :size="18" />
          </button>

          <span class="player-time">
            <strong>{{ formatTime(currentTime) }}</strong>
            <em>/</em>
            <span>{{ formatTime(duration) }}</span>
          </span>

          <button
            type="button"
            class="player-icon-btn danmaku-toggle"
            :class="{ 'is-active': prefs.danmakuEnabled }"
            :aria-label="prefs.danmakuEnabled ? '关闭弹幕' : '开启弹幕'"
            @click="toggleDanmaku"
          >
            <PlayerIcon :name="prefs.danmakuEnabled ? 'danmaku' : 'danmakuOff'" :size="18" />
          </button>

          <button
            type="button"
            class="player-icon-btn composer-toggle"
            aria-label="发送弹幕"
            @click="openComposer"
          >
            <PlayerIcon name="send" :size="16" />
          </button>

          <span class="control-spacer" />

          <button type="button" class="rate-button" :aria-label="`播放速度 ${rateLabel}`" @click="toggleSettings">
            {{ rateLabel }}
          </button>

          <div class="volume-control">
            <button type="button" class="player-icon-btn" :aria-label="prefs.muted ? '取消静音' : '静音'" @click="toggleMute">
              <PlayerIcon :name="volumeIcon" :size="18" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="prefs.muted ? 0 : prefs.volume"
              aria-label="音量"
              @input="onVolumeInput"
            >
          </div>

          <button
            type="button"
            class="player-icon-btn player-settings-btn"
            :class="{ 'is-active': settingsOpen }"
            :aria-expanded="settingsOpen"
            aria-label="播放器设置"
            @click="toggleSettings"
          >
            <PlayerIcon name="tune" :size="18" />
          </button>

          <button v-if="pipSupported" type="button" class="player-icon-btn" aria-label="画中画" @click="togglePip">
            <PlayerIcon name="pip" :size="18" />
          </button>

          <button
            v-if="fullscreenSupported"
            type="button"
            class="player-icon-btn"
            :aria-label="isFullscreen ? '退出全屏' : '全屏'"
            @click="toggleFullscreen"
          >
            <PlayerIcon :name="isFullscreen ? 'fullscreenExit' : 'fullscreen'" :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div class="player-caption">
      <span>NOW PLAYING</span>
      <span>{{ title }}</span>
      <span class="player-caption-danmaku">{{ prefs.danmakuEnabled ? 'DANMAKU ON' : 'DANMAKU OFF' }}</span>
    </div>
  </div>
</template>

<style scoped>
.player-shell {
  --pa: #f3b85f;
  --pa-ink: #171208;
  --pa-rgb: 243, 184, 95;
  display: grid;
  gap: 12px;
  outline: none;
}
.player-shell.skin-ivory {
  --pa: #f3efe4;
  --pa-ink: #171208;
  --pa-rgb: 243, 239, 228;
}
.player-shell.skin-neon {
  --pa: #7ef0c0;
  --pa-ink: #0d1913;
  --pa-rgb: 126, 240, 192;
}
.player-shell.skin-crimson {
  --pa: #ff9a8f;
  --pa-ink: #22100d;
  --pa-rgb: 255, 154, 143;
}

.player-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: #05060a;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
  isolation: isolate;
  user-select: none;
  touch-action: manipulation;
}
.player-stage.is-idle {
  cursor: none;
}
.player-stage.settings-open {
  /* Settings popover grows upward past the rounded stage; keep it fully visible. */
  overflow: visible;
}
.player-stage:fullscreen {
  width: 100vw;
  height: 100vh;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.player-stage:fullscreen .player-video {
  width: 100%;
  height: 100%;
  border-radius: 0;
}
.player-stage:fullscreen .player-top {
  padding: 28px 34px;
}
.player-stage:fullscreen .player-controls {
  padding-right: 34px;
  padding-bottom: 24px;
  padding-left: 34px;
}

.player-video {
  width: 100%;
  height: 100%;
  border-radius: calc(var(--radius-lg) - 1px);
  background: #05060a;
  object-fit: contain;
  cursor: pointer;
}

.player-top {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(to bottom, rgba(5, 6, 9, 0.72), transparent);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-5px);
  transition: opacity 200ms ease, transform 220ms var(--ease-out);
}
.player-top.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.player-top > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.player-kicker {
  color: rgba(243, 239, 228, 0.5);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.15em;
}
.player-top strong {
  overflow: hidden;
  color: #f3efe4;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-top-loading {
  color: rgba(243, 239, 228, 0.55);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.player-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  overflow: hidden;
  padding: 0;
  place-items: center;
  color: #f3efe4;
  background: transparent;
  cursor: pointer;
}
.overlay-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.56) saturate(1.1);
  transition: transform 1.2s var(--ease-out), filter 400ms ease;
}
.player-overlay:hover .overlay-poster {
  transform: scale(1.035);
  filter: brightness(0.48) saturate(1.1);
}
.overlay-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 45%, transparent 10%, rgba(5, 6, 9, 0.34) 62%),
    linear-gradient(to top, rgba(5, 6, 9, 0.82), transparent 52%);
}
.overlay-glyph {
  position: relative;
  z-index: 2;
  display: grid;
  width: 96px;
  height: 96px;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.42);
  border-radius: 50%;
  color: var(--pa-ink);
  background: var(--pa);
  box-shadow: 0 0 0 14px rgba(var(--pa-rgb), 0.08), 0 24px 60px rgba(0, 0, 0, 0.45);
  transition: transform 320ms var(--ease-out), box-shadow 320ms ease;
}
.player-overlay:hover .overlay-glyph {
  transform: scale(1.07);
  box-shadow: 0 0 0 22px rgba(var(--pa-rgb), 0.07), 0 30px 70px rgba(0, 0, 0, 0.5);
}
.overlay-caption {
  position: absolute;
  bottom: 108px;
  z-index: 2;
  color: rgba(243, 239, 228, 0.62);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.2em;
}

.center-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.3);
  border-radius: 50%;
  color: var(--pa-ink);
  background: var(--pa);
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.32);
  cursor: pointer;
  opacity: 0.92;
  transform: translate(-50%, -50%);
  transition: transform 220ms var(--ease-out), opacity 160ms ease;
}
.center-play:hover {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.07);
}
.center-play :deep(svg) {
  margin-left: 2px;
}

.player-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.22);
  border-radius: 50%;
  background: rgba(5, 6, 9, 0.5);
  transform: translate(-50%, -50%);
}
.player-spinner i {
  width: 15px;
  height: 15px;
  border: 1.5px solid rgba(243, 239, 228, 0.25);
  border-top-color: var(--pa);
  border-radius: 50%;
  animation: player-spin 800ms linear infinite;
}
@keyframes player-spin {
  to { transform: rotate(360deg); }
}

.player-state {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 9px;
  padding: 24px;
  color: #c7c2b6;
  background: rgba(5, 6, 10, 0.92);
  text-align: center;
}
.player-state :deep(svg) {
  color: var(--pa);
}
.player-state strong {
  color: #f3efe4;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
}
.player-state span {
  color: #8d897f;
  font-size: 11.5px;
}
.player-state-btn {
  margin-top: 5px;
  padding: 6px 12px;
  border: 1px solid rgba(243, 239, 228, 0.24);
  border-radius: 99px;
  color: #f3efe4;
  background: transparent;
  font-size: 10px;
  cursor: pointer;
}
.player-state-btn:hover {
  border-color: var(--pa);
  color: var(--pa);
}

.player-controls {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 7;
  padding: 0 18px 14px;
  background: linear-gradient(to top, rgba(4, 5, 8, 0.94), rgba(4, 5, 8, 0.62) 55%, transparent);
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px);
  transition: opacity 200ms ease, transform 220ms var(--ease-out);
}
.player-controls.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.danmaku-composer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 7px;
  padding: 6px;
  border: 1px solid rgba(243, 239, 228, 0.12);
  border-radius: 9px;
  background: rgba(8, 10, 14, 0.58);
  backdrop-filter: blur(12px);
}
.composer-modes {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}
.composer-modes button {
  padding: 4px 7px;
  border: 0;
  border-radius: 5px;
  color: rgba(243, 239, 228, 0.42);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 8px;
  cursor: pointer;
}
.composer-modes button:hover,
.composer-modes button.is-active {
  color: var(--pa);
  background: rgba(var(--pa-rgb), 0.1);
}
.composer-input-wrap {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
}
.composer-mark {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.2);
  border-radius: 50%;
  color: var(--pa);
  font-family: var(--font-display);
  font-size: 11px;
}
.composer-input-wrap input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #f3efe4;
  background: transparent;
  font-size: 11px;
}
.composer-input-wrap input::placeholder {
  color: rgba(243, 239, 228, 0.35);
}
.composer-colors {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;
}
.composer-color {
  display: grid;
  width: 19px;
  height: 19px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.composer-color i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--dot);
}
.composer-color:hover,
.composer-color.is-active {
  border-color: rgba(255, 255, 255, 0.5);
}
.composer-send {
  display: grid;
  width: 30px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 6px;
  color: var(--pa-ink);
  background: var(--pa);
  cursor: pointer;
  transition: opacity 160ms ease, transform 180ms var(--ease-out);
}
.composer-send:hover:not(:disabled) {
  transform: scale(1.05);
}
.composer-send:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
.composer-toggle {
  display: none;
}

.progress-line {
  position: relative;
  height: 20px;
  cursor: pointer;
  touch-action: none;
}
.progress-rail {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 4px;
  border-radius: 99px;
  background: rgba(243, 239, 228, 0.18);
  transform: translateY(-50%);
  transition: height 160ms ease;
}
.progress-line:hover .progress-rail,
.player-stage.is-seeking .progress-rail {
  height: 6px;
}
.progress-buffered,
.progress-played {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: inherit;
}
.progress-buffered {
  background: rgba(243, 239, 228, 0.2);
}
.progress-played {
  width: 100%;
  background: var(--pa);
  box-shadow: 0 0 14px rgba(var(--pa-rgb), 0.24);
  transform-origin: left center;
  will-change: transform;
}
.progress-thumb {
  position: absolute;
  top: 50%;
  display: grid;
  width: 12px;
  height: 12px;
  overflow: hidden;
  place-items: center;
  border: 2px solid #12100c;
  border-radius: 50%;
  background: var(--pa);
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 120ms ease, transform 160ms var(--ease-out);
}
.progress-thumb.has-icon {
  width: 26px;
  height: 26px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
  opacity: 1;
}
.progress-thumb.has-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
.progress-line:hover .progress-thumb,
.player-stage.is-seeking .progress-thumb {
  opacity: 1;
}
.danmaku-tick {
  position: absolute;
  top: -2px;
  width: 2px;
  height: 8px;
  border-radius: 2px;
  background: rgba(255, 210, 140, 0.6);
  transform: translateX(-50%);
}
.progress-hover {
  position: absolute;
  bottom: 18px;
  padding: 3px 6px;
  border-radius: 4px;
  color: #f3efe4;
  background: rgba(4, 5, 8, 0.9);
  font-family: var(--font-mono);
  font-size: 9px;
  transform: translateX(-50%);
  white-space: nowrap;
}

.control-row {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 3px;
}
.player-icon-btn {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: rgba(243, 239, 228, 0.72);
  background: transparent;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease, transform 180ms var(--ease-out);
}
.player-icon-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}
.player-icon-btn.is-active {
  color: var(--pa);
}
.player-play-btn {
  width: 36px;
  height: 36px;
  color: #f3efe4;
}
.player-play-btn :deep(svg) {
  margin-left: 1px;
}

.player-time {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-left: 7px;
  color: rgba(243, 239, 228, 0.45);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.player-time strong {
  color: #f3efe4;
  font-weight: 500;
}
.player-time em {
  color: rgba(243, 239, 228, 0.25);
  font-style: normal;
}
.danmaku-toggle {
  margin-left: 4px;
}
.control-spacer {
  flex: 1;
}
.rate-button {
  min-width: 38px;
  padding: 5px 6px;
  border: 0;
  border-radius: 5px;
  color: rgba(243, 239, 228, 0.7);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 9px;
  cursor: pointer;
}
.rate-button:hover {
  color: var(--pa);
  background: rgba(255, 255, 255, 0.08);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 1px;
}
.volume-control input {
  width: 62px;
  height: 3px;
  margin: 0 4px 0 0;
  accent-color: var(--pa);
  cursor: pointer;
  opacity: 0;
  transition: opacity 160ms ease;
}
.volume-control:hover input,
.volume-control:focus-within input {
  opacity: 1;
}
.volume-control input::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 99px;
  background: rgba(243, 239, 228, 0.22);
}
.volume-control input::-webkit-slider-thumb {
  width: 9px;
  height: 9px;
  margin-top: -3px;
  border: 0;
  border-radius: 50%;
  background: var(--pa);
  -webkit-appearance: none;
}
.volume-control input {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

.player-settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(3, 4, 7, 0.58);
  backdrop-filter: blur(3px);
}
.player-settings-panel {
  position: absolute;
  right: 16px;
  bottom: calc(100% + 8px);
  z-index: 10;
  width: 320px;
  max-height: min(62vh, 460px);
  overflow-y: auto;
  padding: 16px;
  border: 1px solid rgba(243, 239, 228, 0.14);
  border-radius: 12px;
  color: #f3efe4;
  background: rgba(12, 14, 19, 0.96);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(20px);
  scrollbar-width: thin;
}
.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 13px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(243, 239, 228, 0.1);
}
.settings-head > span {
  color: rgba(243, 239, 228, 0.46);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}
.settings-head .player-icon-btn {
  width: 26px;
  height: 26px;
}
.settings-section {
  display: grid;
  gap: 9px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(243, 239, 228, 0.08);
}
.settings-section:last-of-type {
  border-bottom: 0;
}
.settings-label {
  color: rgba(243, 239, 228, 0.5);
  font-size: 9.5px;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.settings-row--wrap {
  align-items: flex-start;
}
.settings-row--wrap .settings-label {
  padding-top: 5px;
}
.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.settings-option {
  padding: 4px 8px;
  border: 1px solid rgba(243, 239, 228, 0.1);
  border-radius: 5px;
  color: rgba(243, 239, 228, 0.56);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 9px;
  cursor: pointer;
}
.settings-option:hover {
  border-color: rgba(243, 239, 228, 0.3);
  color: #f3efe4;
}
.settings-option.is-active {
  border-color: var(--pa);
  color: var(--pa-ink);
  background: var(--pa);
}
.settings-options--compact {
  justify-content: flex-end;
}
.settings-switch {
  position: relative;
  width: 32px;
  height: 18px;
  border: 0;
  border-radius: 99px;
  background: rgba(243, 239, 228, 0.16);
  cursor: pointer;
  transition: background 160ms ease;
}
.settings-switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8d897f;
  transition: transform 160ms ease, background 160ms ease;
}
.settings-switch.is-on {
  background: rgba(var(--pa-rgb), 0.28);
}
.settings-switch.is-on i {
  background: var(--pa);
  transform: translateX(14px);
}
.settings-range {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 7px;
  color: rgba(243, 239, 228, 0.42);
  font-size: 9px;
}
.settings-range input {
  width: 100%;
  accent-color: var(--pa);
}
.settings-range em {
  color: rgba(243, 239, 228, 0.6);
  font-family: var(--font-mono);
  font-size: 8px;
  font-style: normal;
  text-align: right;
}
.settings-colors {
  display: flex;
  align-items: center;
  gap: 5px;
}
.settings-color {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.settings-color i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--dot);
}
.settings-color:hover,
.settings-color.is-active {
  border-color: rgba(243, 239, 228, 0.55);
}
.settings-skins {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.skin-swatch {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 7px 3px;
  border: 1px solid rgba(243, 239, 228, 0.1);
  border-radius: 7px;
  color: rgba(243, 239, 228, 0.42);
  background: transparent;
  font-size: 8px;
  cursor: pointer;
}
.skin-swatch i {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--swatch);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.04);
}
.skin-swatch.is-active {
  border-color: var(--swatch);
  color: #f3efe4;
}
.settings-caption {
  color: rgba(243, 239, 228, 0.3);
  font-size: 8px;
}
.settings-hint {
  padding-top: 10px;
  color: rgba(243, 239, 228, 0.28);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.03em;
}
.settings-dismiss {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(243, 239, 228, 0.12);
  border-radius: 7px;
  color: rgba(243, 239, 228, 0.6);
  background: rgba(243, 239, 228, 0.03);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
}
.settings-dismiss:hover {
  color: #f3efe4;
  border-color: rgba(243, 239, 228, 0.3);
  background: rgba(243, 239, 228, 0.07);
}

.player-caption {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 4px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
}
.player-caption span:nth-child(2) {
  overflow: hidden;
  flex: 1;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-caption-danmaku {
  color: var(--muted-weak);
  font-size: 7px;
  white-space: nowrap;
}

.player-fade-enter-active,
.player-fade-leave-active {
  transition: opacity 180ms ease;
}
.player-fade-enter-from,
.player-fade-leave-to {
  opacity: 0;
}
.player-settings-enter-active,
.player-settings-leave-active {
  transition: opacity 160ms ease, transform 180ms var(--ease-out);
}
.player-settings-enter-from,
.player-settings-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 760px) {
  .danmaku-composer {
    display: none;
  }
  .danmaku-composer.is-open {
    display: flex;
  }
  .composer-toggle {
    display: grid;
  }
  .player-controls {
    padding: 0 9px 9px;
  }
  .player-top {
    padding: 13px;
  }
  .player-top strong {
    font-size: 14px;
  }
  .danmaku-composer {
    gap: 5px;
    padding: 4px;
  }
  .composer-modes {
    display: none;
  }
  .composer-colors {
    display: none;
  }
  .composer-input-wrap {
    padding: 0 5px;
  }
  .control-row {
    min-height: 34px;
  }
  .player-icon-btn {
    width: 31px;
    height: 31px;
  }
  .player-play-btn {
    width: 34px;
    height: 34px;
  }
  .desktop-only {
    display: none;
  }
  .player-time {
    margin-left: 3px;
    font-size: 8px;
  }
  .volume-control input {
    display: none;
  }
  .player-settings-panel.is-mobile {
    position: fixed;
    right: 10px;
    bottom: 10px;
    left: 10px;
    z-index: 1001;
    width: auto;
    max-height: 72vh;
    border-radius: 14px;
  }
  .player-caption-danmaku {
    display: none;
  }
  .overlay-glyph {
    width: 70px;
    height: 70px;
  }
  .overlay-caption {
    bottom: 20px;
    font-size: 7.5px;
  }
}

@media (max-width: 460px) {
  .rate-button {
    min-width: 32px;
    padding: 4px;
    font-size: 8px;
  }
  .player-time span:last-child {
    display: none;
  }
  .center-play {
    width: 52px;
    height: 52px;
  }
}
</style>
