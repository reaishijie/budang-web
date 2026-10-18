<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Danmaku } from '~/types'

const props = withDefaults(defineProps<{
  items: Danmaku[]
  currentTime: number
  playing: boolean
  enabled: boolean
  opacity: number
  fontSize: number
  area: number
}>(), {
  opacity: 0.9,
  fontSize: 18,
  area: 0.6,
})

interface ActiveDanmaku {
  key: string
  id: number
  content: string
  color: string
  mode: Danmaku['mode']
  top: number
  duration: number
  fontSize: number
}

const layerEl = ref<HTMLDivElement | null>(null)
const layerWidth = ref(0)
const layerHeight = ref(0)
const active = ref<ActiveDanmaku[]>([])
const spawned = new Set<number>()

let lastTime = 0
let laneFree: number[] = []
let topRows = 0
let bottomRows = 0
let resizeObserver: ResizeObserver | null = null
let sequence = 0

const lineHeight = computed(() => Math.max(28, Math.round(props.fontSize * 1.85)))
const laneCount = computed(() => {
  const usable = Math.max(0, layerHeight.value * props.area - 16)
  return Math.max(2, Math.min(14, Math.floor(usable / lineHeight.value)))
})
const layerStyle = computed<Record<string, string | number>>(() => ({
  opacity: props.opacity,
  '--layer-width': `${layerWidth.value}px`,
}))

function lane(time: number) {
  if (laneFree.length !== laneCount.value) {
    const previous = laneFree
    laneFree = Array.from({ length: laneCount.value }, (_, index) => previous[index] ?? 0)
  }
  const free = laneFree.findIndex(value => value <= time)
  const chosen = free >= 0
    ? free
    : laneFree.indexOf(Math.min(...laneFree))
  laneFree[chosen] = time + 2.6
  return chosen
}

function rowFor(mode: 'TOP' | 'BOTTOM') {
  const topOffset = Math.max(44, layerHeight.value * 0.085)
  if (mode === 'TOP') {
    const row = topRows % Math.min(4, laneCount.value)
    topRows += 1
    return topOffset + row * lineHeight.value
  }
  const row = bottomRows % Math.min(3, laneCount.value)
  bottomRows += 1
  return Math.max(topOffset, layerHeight.value - 64 - row * lineHeight.value)
}

function spawn(item: Danmaku, immediate = false) {
  if (spawned.has(item.id) || active.value.length >= 70) return
  spawned.add(item.id)

  const topOffset = Math.max(44, layerHeight.value * 0.085)
  const top = item.mode === 'SCROLL'
    ? topOffset + lane(props.currentTime) * lineHeight.value
    : rowFor(item.mode)
  const duration = item.mode === 'SCROLL'
    ? Math.min(13, Math.max(7, 7.2 + item.content.length * 0.085))
    : 3.4

  active.value.push({
    key: `${item.id}-${sequence++}`,
    id: item.id,
    content: item.content,
    color: item.color,
    mode: item.mode,
    top,
    duration,
    fontSize: props.fontSize,
  })

  if (!immediate) lastTime = props.currentTime
}

function drop(key: string) {
  const index = active.value.findIndex(item => item.key === key)
  if (index >= 0) active.value.splice(index, 1)
}

function reset(time = props.currentTime) {
  active.value = []
  spawned.clear()
  laneFree = []
  topRows = 0
  bottomRows = 0
  lastTime = Number.isFinite(time) ? time : 0
}

function tick(time: number) {
  if (!props.enabled) {
    if (active.value.length) active.value = []
    lastTime = time
    return
  }
  if (!Number.isFinite(time)) return

  if (time < lastTime - 0.25 || time > lastTime + 2.5) {
    reset(time)
    return
  }
  if (!props.playing) {
    lastTime = time
    return
  }

  const upper = time + 0.18
  for (const item of props.items) {
    if (item.time > upper) break
    if (item.time >= lastTime - 0.05) spawn(item)
  }
  lastTime = time
}

function playNow(item: Danmaku) {
  if (!props.enabled) return
  spawn(item, true)
}

watch(() => props.currentTime, tick)
watch(() => props.enabled, (enabled) => {
  reset(props.currentTime)
  if (!enabled) active.value = []
})
watch(() => [props.fontSize, props.area], () => reset(props.currentTime))

onMounted(() => {
  if (!layerEl.value) return
  const updateSize = () => {
    layerWidth.value = layerEl.value?.clientWidth ?? 0
    layerHeight.value = layerEl.value?.clientHeight ?? 0
  }
  updateSize()
  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(layerEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

function itemStyle(item: ActiveDanmaku) {
  return {
    top: `${item.top}px`,
    color: item.color,
    fontSize: `${item.fontSize}px`,
    '--duration': `${item.duration}s`,
  }
}

defineExpose({ playNow, reset })
</script>

<template>
  <div ref="layerEl" class="danmaku-layer" :style="layerStyle" aria-hidden="true">
    <span
      v-for="item in active"
      :key="item.key"
      class="danmaku-item"
      :class="[
        `is-${item.mode.toLowerCase()}`,
        { 'is-paused': !playing },
      ]"
      :style="itemStyle(item)"
      @animationend="drop(item.key)"
    >
      {{ item.content }}
    </span>
  </div>
</template>

<style scoped>
.danmaku-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
  transition: opacity 200ms ease;
  contain: layout paint;
}

.danmaku-item {
  position: absolute;
  left: 100%;
  max-width: 80%;
  overflow: hidden;
  padding: 2px 5px;
  color: #f3efe4;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 8px rgba(0, 0, 0, 0.75);
  white-space: nowrap;
  will-change: transform;
  animation: danmaku-scroll var(--duration) linear forwards;
}

.danmaku-item.is-top,
.danmaku-item.is-bottom {
  left: 50%;
  max-width: 78%;
  animation: danmaku-fade var(--duration) ease forwards;
}

.danmaku-item.is-bottom {
  animation-name: danmaku-fade-up;
}

.danmaku-item.is-paused {
  animation-play-state: paused;
}

@keyframes danmaku-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-100% - var(--layer-width) - 12px)); }
}

@keyframes danmaku-fade {
  0% { opacity: 0; transform: translate(-50%, 6px); }
  10%, 80% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -4px); }
}

@keyframes danmaku-fade-up {
  0% { opacity: 0; transform: translate(-50%, -6px); }
  10%, 80% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, 4px); }
}

@media (prefers-reduced-motion: reduce) {
  .danmaku-item {
    animation-duration: 0.01s;
  }
}
</style>
