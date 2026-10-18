<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Video } from '~/types'
import { formatCount, formatDuration } from '~/utils/format'

type RankingMode = 'views' | 'likes' | 'comments'

interface RankingTab {
  key: RankingMode
  label: string
  en: string
  description: string
  icon: string
  metricLabel: string
}

const tabs: RankingTab[] = [
  {
    key: 'views',
    label: '热播榜',
    en: 'MOST WATCHED',
    description: '按累计观看次数排序',
    icon: 'eye',
    metricLabel: '次观看',
  },
  {
    key: 'likes',
    label: '口碑榜',
    en: 'MOST LOVED',
    description: '按喜欢数排序',
    icon: 'heart',
    metricLabel: '喜欢',
  },
  {
    key: 'comments',
    label: '讨论榜',
    en: 'MOST DISCUSSED',
    description: '按评论数排序',
    icon: 'message',
    metricLabel: '条讨论',
  },
]

const videoApi = useVideoApi()
const activeKey = ref<RankingMode>('views')

const { data, pending, error, refresh } = await useAsyncData('video-rankings', async () => {
  const [views, likes, comments] = await Promise.all([
    videoApi.listVideos({ page: 1, pageSize: 20, sort: 'popular' }),
    videoApi.listVideos({ page: 1, pageSize: 20, sort: 'likes' }),
    videoApi.listVideos({ page: 1, pageSize: 20, sort: 'comments' }),
  ])

  return {
    views: views.items,
    likes: likes.items,
    comments: comments.items,
    total: views.total,
    fetchedAt: new Date().toISOString(),
  }
}, {
  default: () => ({
    views: [] as Video[],
    likes: [] as Video[],
    comments: [] as Video[],
    total: 0,
    fetchedAt: '',
  }),
})

const activeTab = computed(() => tabs.find(tab => tab.key === activeKey.value) ?? tabs[0]!)
const list = computed(() => data.value?.[activeKey.value] ?? [])
const topThree = computed(() => list.value.slice(0, 3))
const podium = computed(() =>
  [1, 0, 2]
    .map(index => ({ video: list.value[index], rank: index + 1 }))
    .filter((item): item is { video: Video; rank: number } => Boolean(item.video)),
)
const rest = computed(() => list.value.slice(3))

const metricValue = (video?: Video) => {
  if (!video) return 0
  if (activeKey.value === 'likes') return video.counts.likes
  if (activeKey.value === 'comments') return video.counts.comments
  return video.counts.views
}

const maxMetric = computed(() => Math.max(metricValue(list.value[0]), 1))
const topViews = computed(() => list.value.reduce((sum, video) => sum + video.counts.views, 0))
const averageDuration = computed(() => {
  if (!list.value.length) return 0
  return Math.round(list.value.reduce((sum, video) => sum + video.duration, 0) / list.value.length)
})
const topCategory = computed(() => {
  const counts = new Map<string, number>()
  for (const video of list.value) {
    const name = video.category?.name || '未分类'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
})
const updatedTime = computed(() => {
  if (!data.value?.fetchedAt) return '刚刚'
  const date = new Date(data.value.fetchedAt)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleTimeString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
})

function setTab(key: RankingMode) {
  activeKey.value = key
}

function barWidth(video: Video) {
  return `${Math.max(3, Math.round((metricValue(video) / maxMetric.value) * 100))}%`
}

useSeoMeta({
  title: '热度榜',
  description: '补档热播榜、口碑榜与讨论榜：用观看、喜欢和讨论，看看此刻大家都在看什么。',
  ogTitle: '补档热度榜',
  ogDescription: '实时热播、口碑与讨论榜单。',
})
</script>

<template>
  <div class="page charts-page" :class="`charts-page--${activeKey}`">
    <div class="container">
      <header class="charts-head">
        <div class="charts-title-wrap">
          <span class="eyebrow">THE CHARTS · 实时榜单</span>
          <h1 class="charts-title">热度榜</h1>
          <p>
            观看、喜欢与讨论，汇成三张不同的榜单。
            看看此刻，银幕上最亮的是哪一束光。
          </p>
        </div>

        <div class="charts-live">
          <span class="live-line"><i /> LIVE</span>
          <strong>更新于 {{ updatedTime }}</strong>
          <span>{{ data?.total ?? 0 }} 部影片参与排名</span>
        </div>
      </header>

      <div class="chart-tabs" role="tablist" aria-label="榜单类型">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="chart-tab"
          :class="{ 'is-active': activeKey === tab.key }"
          type="button"
          role="tab"
          :aria-selected="activeKey === tab.key"
          @click="setTab(tab.key)"
        >
          <span class="tab-icon"><AppIcon :name="tab.icon" :size="16" /></span>
          <span class="tab-copy">
            <strong>{{ tab.label }}</strong>
            <small>{{ tab.en }}</small>
          </span>
          <span class="tab-index">0{{ tabs.findIndex(item => item.key === tab.key) + 1 }}</span>
        </button>
      </div>

      <div class="chart-subhead">
        <span>{{ activeTab.description }}</span>
        <span>统计范围：全部已发布影片 · 累计数据</span>
      </div>

      <div v-if="error" class="charts-error">
        <AppIcon name="alert" :size="16" />
        <span>{{ error.message }}</span>
        <button type="button" @click="refresh()">重新加载</button>
      </div>

      <div v-if="pending" class="charts-skeleton">
        <div class="skeleton podium-skeleton" />
        <div class="skeleton" style="height: 420px; border-radius: 18px;" />
      </div>

      <template v-else-if="list.length">
        <section class="podium" aria-label="榜单前三名">
          <NuxtLink
            v-for="item in podium"
            :key="item.video.id"
            class="podium-card"
            :class="`is-rank-${item.rank}`"
            :to="`/videos/${item.video.id}`"
          >
            <div class="podium-poster">
              <img
                v-if="item.video.coverUrl"
                :src="item.video.coverUrl"
                :alt="item.video.title"
                loading="eager"
              >
              <span v-else class="podium-fallback">{{ [...item.video.title][0] || '光' }}</span>
              <div class="podium-veil" />
              <span class="podium-rank">
                <small>NO.</small>0{{ item.rank }}
              </span>
              <span class="podium-play"><AppIcon name="play" :size="16" /></span>
              <span class="podium-metric">
                {{ formatCount(metricValue(item.video)) }}
                <small>{{ activeTab.metricLabel }}</small>
              </span>
            </div>

            <div class="podium-copy">
              <div class="podium-topline">
                <span>{{ item.video.category?.name || '未分类' }}</span>
                <span>{{ formatDuration(item.video.duration) }}</span>
              </div>
              <h2>{{ item.video.title }}</h2>
              <p>{{ item.video.uploader?.nickname || item.video.uploader?.username || '补档放映室' }}</p>
            </div>
          </NuxtLink>
        </section>

        <div class="charts-body">
          <section class="chart-list-panel">
            <header class="chart-list-head">
              <div>
                <span class="section-kicker">RANK 04 — {{ String(list.length).padStart(2, '0') }}</span>
                <h2>完整榜单</h2>
              </div>
              <span class="chart-list-note">{{ activeTab.en }}</span>
            </header>

            <ol class="chart-list">
              <li v-for="(video, index) in rest" :key="video.id">
                <NuxtLink class="chart-row" :to="`/videos/${video.id}`">
                  <span class="chart-rank">{{ String(index + 4).padStart(2, '0') }}</span>

                  <span class="chart-thumb">
                    <img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" loading="lazy">
                    <span v-else>{{ [...video.title][0] || '光' }}</span>
                  </span>

                  <span class="chart-copy">
                    <span class="chart-title">{{ video.title }}</span>
                    <span class="chart-meta">
                      {{ video.category?.name || '未分类' }}
                      <i />
                      {{ video.uploader?.nickname || video.uploader?.username || '补档放映室' }}
                    </span>
                    <span class="chart-bar">
                      <i :style="{ width: barWidth(video) }" />
                    </span>
                  </span>

                  <span class="chart-value">
                    <strong>{{ formatCount(metricValue(video)) }}</strong>
                    <small>{{ activeTab.metricLabel }}</small>
                  </span>

                  <AppIcon name="chevronRight" :size="15" class="chart-arrow" />
                </NuxtLink>
              </li>
            </ol>
          </section>

          <aside class="charts-side">
            <section class="side-panel">
              <span class="side-label">CHART METHOD</span>
              <h3>榜单口径</h3>
              <p>
                榜单实时读取片库数据。三条榜单分别依据累计观看、喜欢与评论排序，
                不做时间加权，也不隐藏低热度影片。
              </p>
              <div class="method-list">
                <div v-for="tab in tabs" :key="tab.key" :class="{ 'is-current': activeKey === tab.key }">
                  <span class="method-icon"><AppIcon :name="tab.icon" :size="14" /></span>
                  <span>
                    <strong>{{ tab.label }}</strong>
                    <small>{{ tab.description }}</small>
                  </span>
                </div>
              </div>
            </section>

            <section class="side-panel stats-panel">
              <span class="side-label">THIS BOARD</span>
              <h3>本期数字</h3>
              <dl>
                <div><dt>参与影片</dt><dd>{{ data?.total ?? 0 }}</dd></div>
                <div><dt>TOP 20 观看</dt><dd>{{ formatCount(topViews) }}</dd></div>
                <div><dt>平均时长</dt><dd>{{ formatDuration(averageDuration) }}</dd></div>
                <div><dt>最热单元</dt><dd>{{ topCategory }}</dd></div>
              </dl>
            </section>

            <NuxtLink class="side-browse" to="/videos">
              <span>
                <small>THE FULL ARCHIVE</small>
                <strong>去片库找下一部</strong>
              </span>
              <AppIcon name="arrowRight" :size="17" />
            </NuxtLink>
          </aside>
        </div>

        <footer class="charts-footer">
          <div>
            <span class="section-kicker">KEEP THE LIGHT ON</span>
            <h2>榜单之外，还有一整座片库。</h2>
          </div>
          <NuxtLink class="btn btn-ghost" to="/videos">
            浏览全部影片
            <AppIcon name="arrowRight" :size="14" />
          </NuxtLink>
        </footer>
      </template>

      <EmptyState
        v-else
        icon="film"
        title="榜单还没有亮起"
        text="当片库出现第一部影片，热播榜就会开始记录它的光。"
      >
        <NuxtLink class="btn btn-primary btn-sm" to="/videos">去片库看看</NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.charts-page {
  --chart-accent: var(--amber);
  --chart-accent-soft: rgba(243, 184, 95, 0.14);
  --chart-glow: rgba(243, 184, 95, 0.09);
  padding-top: clamp(30px, 4vw, 56px);
}

.charts-page--likes {
  --chart-accent: var(--coral);
  --chart-accent-soft: rgba(242, 122, 104, 0.14);
  --chart-glow: rgba(242, 122, 104, 0.09);
}

.charts-page--comments {
  --chart-accent: var(--blue);
  --chart-accent-soft: rgba(139, 180, 255, 0.12);
  --chart-glow: rgba(139, 180, 255, 0.08);
}

.charts-page::before {
  position: absolute;
  top: -10%;
  right: -5%;
  width: 60vw;
  height: 60vw;
  max-width: 760px;
  max-height: 760px;
  border-radius: 50%;
  background: var(--chart-glow);
  filter: blur(50px);
  content: "";
  pointer-events: none;
  transition: background 400ms ease;
}

.charts-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--line);
}

.charts-title-wrap {
  display: grid;
  gap: 12px;
}

.charts-title {
  font-family: var(--font-display);
  font-size: clamp(54px, 8vw, 108px);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 0.88;
}

.charts-title-wrap p {
  max-width: 560px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.8;
}

.charts-live {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 4px;
  padding-bottom: 5px;
  text-align: right;
}
.live-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--chart-accent);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.18em;
}
.live-line i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--chart-accent);
  box-shadow: 0 0 12px var(--chart-accent);
  animation: live-pulse 2.2s ease-in-out infinite;
}
.charts-live strong {
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 500;
}
.charts-live span:last-child {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.05em;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.chart-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-top: 22px;
}

.chart-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 68px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: 13px;
  color: var(--muted);
  background: rgba(15, 18, 24, 0.46);
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, transform 220ms var(--ease-out);
}
.chart-tab:hover {
  border-color: var(--line-strong);
  transform: translateY(-2px);
}
.chart-tab.is-active {
  border-color: color-mix(in srgb, var(--chart-accent) 46%, transparent);
  background:
    linear-gradient(135deg, var(--chart-accent-soft), transparent 70%),
    rgba(15, 18, 24, 0.7);
}
.tab-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--muted);
  background: rgba(6, 7, 10, 0.35);
}
.chart-tab.is-active .tab-icon {
  color: #171208;
  border-color: transparent;
  background: var(--chart-accent);
}
.tab-copy {
  display: grid;
  gap: 3px;
}
.tab-copy strong {
  color: var(--ink-soft);
  font-size: 12.5px;
  font-weight: 600;
}
.chart-tab.is-active .tab-copy strong {
  color: var(--ink);
}
.tab-copy small {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
}
.tab-index {
  margin-left: auto;
  color: var(--muted-weak);
  font-family: var(--font-display);
  font-size: 21px;
  line-height: 1;
}
.chart-tab.is-active .tab-index {
  color: var(--chart-accent);
}

.chart-subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 2px 0;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.06em;
}
.chart-subhead span:first-child {
  color: var(--chart-accent);
}

.podium {
  display: grid;
  grid-template-columns: 1fr 1.16fr 1fr;
  align-items: end;
  gap: clamp(14px, 2vw, 24px);
  margin-top: 28px;
}

.podium-card {
  display: grid;
  min-width: 0;
  gap: 12px;
  transition: transform 300ms var(--ease-out);
}
.podium-card:hover {
  transform: translateY(-5px);
}
.podium-card.is-rank-1 {
  transform: translateY(-18px);
}
.podium-card.is-rank-1:hover {
  transform: translateY(-23px);
}

.podium-poster {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 5;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.4);
  isolation: isolate;
}
.podium-card.is-rank-1 .podium-poster {
  border-color: color-mix(in srgb, var(--chart-accent) 42%, var(--line));
  box-shadow: 0 34px 90px rgba(0, 0, 0, 0.55), 0 0 0 1px var(--chart-accent-soft);
}

.podium-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 800ms var(--ease-out), filter 400ms ease;
}
.podium-card:hover .podium-poster img {
  transform: scale(1.04);
  filter: brightness(0.78);
}
.podium-fallback {
  display: grid;
  height: 100%;
  place-items: center;
  color: rgba(243, 239, 228, 0.65);
  background: linear-gradient(145deg, #242a34, #0a0b10);
  font-family: var(--font-display);
  font-size: clamp(56px, 7vw, 92px);
}

.podium-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, rgba(5, 6, 9, 0.9), transparent 48%),
    linear-gradient(to bottom, rgba(5, 6, 9, 0.3), transparent 24%);
}

.podium-rank {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 2;
  color: var(--chart-accent);
  font-family: var(--font-display);
  font-size: clamp(35px, 4.4vw, 62px);
  line-height: 0.9;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}
.podium-rank small {
  display: block;
  margin-bottom: 4px;
  color: rgba(243, 239, 228, 0.55);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
}

.podium-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 1px solid rgba(243, 239, 228, 0.32);
  border-radius: 50%;
  color: #171208;
  background: var(--chart-accent);
  opacity: 0;
  transform: translate(-50%, -42%) scale(0.9);
  transition: opacity 200ms ease, transform 260ms var(--ease-out);
}
.podium-play :deep(svg) {
  margin-left: 2px;
}
.podium-card:hover .podium-play {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.podium-metric {
  position: absolute;
  right: 18px;
  bottom: 16px;
  z-index: 2;
  display: grid;
  justify-items: end;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 36px);
  line-height: 1;
}
.podium-metric small {
  margin-top: 3px;
  color: var(--chart-accent);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.06em;
}

.podium-copy {
  display: grid;
  gap: 4px;
  padding: 0 3px;
}
.podium-topline {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.07em;
}
.podium-topline span:first-child {
  color: var(--chart-accent);
}
.podium-copy h2 {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.2vw, 27px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.podium-copy p {
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.charts-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: clamp(20px, 3vw, 38px);
  align-items: start;
  margin-top: clamp(46px, 6vw, 78px);
}

.chart-list-panel {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: rgba(15, 18, 24, 0.46);
}
.chart-list-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--line);
}
.chart-list-head > div {
  display: grid;
  gap: 5px;
}
.chart-list-head h2 {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.02em;
}
.chart-list-note {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.1em;
}

.chart-list {
  display: grid;
}
.chart-list li {
  border-bottom: 1px solid var(--line);
}
.chart-list li:last-child {
  border-bottom: 0;
}
.chart-row {
  display: grid;
  grid-template-columns: 38px 96px minmax(0, 1fr) 90px 20px;
  align-items: center;
  gap: 14px;
  padding: 13px 20px;
  transition: background 160ms ease, padding 200ms var(--ease-out);
}
.chart-row:hover {
  padding-left: 25px;
  background: rgba(243, 239, 228, 0.028);
}
.chart-rank {
  color: var(--muted-weak);
  font-family: var(--font-display);
  font-size: 23px;
  line-height: 1;
}
.chart-row:hover .chart-rank {
  color: var(--chart-accent);
}
.chart-thumb {
  display: grid;
  width: 96px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--muted);
  background: var(--surface-2);
  font-family: var(--font-display);
  font-size: 20px;
}
.chart-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.chart-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}
.chart-title {
  overflow: hidden;
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart-row:hover .chart-title {
  color: var(--ink);
}
.chart-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  color: var(--muted-weak);
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart-meta i {
  width: 3px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--muted-weak);
}
.chart-bar {
  display: block;
  width: min(220px, 100%);
  height: 2px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(243, 239, 228, 0.08);
}
.chart-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--chart-accent);
  opacity: 0.72;
}
.chart-value {
  display: grid;
  justify-items: end;
  gap: 2px;
}
.chart-value strong {
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  line-height: 1;
}
.chart-value small {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
}
.chart-arrow {
  color: var(--muted-weak);
  opacity: 0;
  transform: translateX(-4px);
  transition: 160ms ease;
}
.chart-row:hover .chart-arrow {
  color: var(--chart-accent);
  opacity: 1;
  transform: translateX(0);
}

.charts-side {
  position: sticky;
  top: calc(var(--header-height) + 24px);
  display: grid;
  gap: 13px;
}

.side-panel {
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(15, 18, 24, 0.5);
}
.side-label {
  display: block;
  margin-bottom: 10px;
  color: var(--chart-accent);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.16em;
}
.side-panel h3 {
  margin-bottom: 9px;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.side-panel > p {
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.75;
}

.method-list {
  display: grid;
  gap: 7px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.method-list > div {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px;
  border-radius: 8px;
  opacity: 0.55;
  transition: 160ms ease;
}
.method-list > div.is-current {
  opacity: 1;
  background: var(--chart-accent-soft);
}
.method-icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--chart-accent);
}
.method-list > div > span:last-child {
  display: grid;
  gap: 1px;
}
.method-list strong {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 600;
}
.method-list small {
  color: var(--muted-weak);
  font-size: 8.5px;
}

.stats-panel dl {
  display: grid;
  gap: 0;
  margin: 14px 0 0;
  border-top: 1px solid var(--line);
}
.stats-panel dl > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
}
.stats-panel dl > div:last-child {
  border-bottom: 0;
}
.stats-panel dt {
  color: var(--muted);
  font-size: 9.5px;
}
.stats-panel dd {
  margin: 0;
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 17px;
}

.side-browse {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink-soft);
  background: rgba(15, 18, 24, 0.45);
  transition: 180ms ease;
}
.side-browse:hover {
  border-color: var(--line-strong);
  background: rgba(243, 239, 228, 0.04);
}
.side-browse span {
  display: grid;
  gap: 2px;
}
.side-browse small {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.1em;
}
.side-browse strong {
  font-size: 11.5px;
}
.side-browse :deep(svg) {
  color: var(--chart-accent);
}

.charts-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: clamp(46px, 6vw, 72px);
  padding: 28px 0;
  border-top: 1px solid var(--line);
}
.charts-footer > div {
  display: grid;
  gap: 7px;
}
.charts-footer h2 {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 400;
  letter-spacing: -0.025em;
}

.charts-error {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 22px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 123, 111, 0.24);
  border-radius: 10px;
  color: #ffb0a6;
  background: rgba(255, 123, 111, 0.06);
  font-size: 11.5px;
}
.charts-error button {
  margin-left: auto;
  border: 1px solid currentColor;
  border-radius: 99px;
  padding: 3px 9px;
  color: inherit;
  background: transparent;
  font-size: 9.5px;
  cursor: pointer;
}

.charts-skeleton {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}
.podium-skeleton {
  height: 420px;
}

@media (max-width: 1000px) {
  .charts-body {
    grid-template-columns: minmax(0, 1fr) 270px;
  }
  .chart-row {
    grid-template-columns: 32px 82px minmax(0, 1fr) 78px 16px;
    gap: 11px;
    padding: 12px 16px;
  }
  .chart-thumb {
    width: 82px;
  }
}

@media (max-width: 840px) {
  .charts-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }
  .charts-live {
    justify-items: start;
    text-align: left;
  }
  .chart-tabs {
    grid-template-columns: 1fr;
  }
  .chart-tab {
    min-height: 56px;
  }
  .podium {
    grid-template-columns: 1fr;
    gap: 26px;
  }
  .podium-card {
    order: 2;
  }
  .podium-card.is-rank-1 {
    order: 1;
    transform: none;
  }
  .podium-card.is-rank-1:hover {
    transform: translateY(-5px);
  }
  .podium-card.is-rank-2 {
    order: 2;
  }
  .podium-card.is-rank-3 {
    order: 3;
  }
  .podium-poster {
    aspect-ratio: 16 / 10;
  }
  .charts-body {
    grid-template-columns: 1fr;
  }
  .charts-side {
    position: static;
    grid-template-columns: 1fr 1fr;
  }
  .side-browse {
    grid-column: 1 / -1;
  }
}

@media (max-width: 620px) {
  .charts-title {
    font-size: clamp(52px, 16vw, 78px);
  }
  .chart-subhead {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
    padding-top: 13px;
  }
  .chart-list-head {
    padding: 18px;
  }
  .chart-row {
    grid-template-columns: 26px 60px minmax(0, 1fr) 48px 14px;
    gap: 8px;
    padding: 11px 13px;
  }
  .chart-row:hover {
    padding-left: 16px;
  }
  .chart-thumb {
    width: 64px;
  }
  .chart-value strong {
    font-size: 15px;
  }
  .chart-value small {
    display: none;
  }
  .chart-title {
    font-size: 16px;
  }
  .chart-arrow {
    opacity: 1;
    transform: none;
  }
  .charts-side {
    grid-template-columns: 1fr;
  }
  .charts-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
}
</style>
