<script setup lang="ts">
import { computed } from 'vue'
import type { Category, HistoryItem, TagItem, Video } from '~/types'
import { formatCount, progressPercent } from '~/utils/format'

const siteSettings = useSiteSettings()
const auth = useAuth()
const videoApi = useVideoApi()

const { data, pending, error, refresh } = await useAsyncData('video-home', async () => {
  const user = auth.user.value
  const [categoryResult, latestResult, popularResult, tagsResult, historyResult] = await Promise.allSettled([
    videoApi.listCategories(1, 100),
    videoApi.listVideos({ page: 1, pageSize: 12, sort: 'latest' }),
    videoApi.listVideos({ page: 1, pageSize: 6, sort: 'popular' }),
    videoApi.listTags(1, 14),
    user ? videoApi.listHistory(1, 6) : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 6, totalPages: 0 }),
  ])

  return {
    categories: categoryResult.status === 'fulfilled' ? categoryResult.value.items : [] as Category[],
    latest: latestResult.status === 'fulfilled' ? latestResult.value.items : [] as Video[],
    popular: popularResult.status === 'fulfilled' ? popularResult.value.items : [] as Video[],
    tags: tagsResult.status === 'fulfilled' ? tagsResult.value.items : [] as TagItem[],
    history: historyResult.status === 'fulfilled' ? historyResult.value.items : [] as HistoryItem[],
    loadError: latestResult.status === 'rejected'
      ? (latestResult.reason instanceof Error ? latestResult.reason.message : '片库加载失败')
      : '',
  }
}, {
  default: () => ({
    categories: [] as Category[],
    latest: [] as Video[],
    popular: [] as Video[],
    tags: [] as TagItem[],
    history: [] as HistoryItem[],
    loadError: '',
  }),
})

watch(() => auth.user.value?.id, () => {
  void refresh()
})

const categories = computed(() => data.value?.categories ?? [])
const latest = computed(() => data.value?.latest ?? [])
const popular = computed(() => data.value?.popular ?? [])
const tags = computed(() => data.value?.tags ?? [])
const history = computed(() => data.value?.history ?? [])
const heroVideo = computed(() => popular.value[0] ?? latest.value[0] ?? null)
const continueWatching = computed(() => history.value.slice(0, 4))
const gridVideos = computed(() => latest.value.slice(0, 8))
const collectionCategories = computed(() => categories.value.slice(0, 4))

const collectionHues = [34, 188, 8, 270]

useSeoMeta({
  title: '把好故事留在银幕上',
  description: () => siteSettings.value.description,
  ogTitle: '把好故事留在银幕上',
  ogDescription: () => siteSettings.value.description,
})
</script>

<template>
  <div class="home page">
    <div class="container">
      <SpotlightHero v-if="heroVideo" :video="heroVideo" />

      <section v-else class="hero-empty">
        <div class="hero-empty-glow" aria-hidden="true" />
        <p class="eyebrow">SCREENING ROOM · OPEN</p>
        <h1 class="display-title">银幕<br><em>尚未点亮</em></h1>
        <p class="hero-empty-text">
          这里还没有影片。第一束光，等你来打开。
        </p>
        <div class="hero-empty-actions">
          <NuxtLink v-if="auth.isAdmin.value" class="btn btn-primary btn-lg" to="/admin/review">
            <AppIcon name="film" :size="16" />
            去后台上传影片
          </NuxtLink>
          <NuxtLink v-else-if="auth.canUpload.value" class="btn btn-primary btn-lg" to="/upload">
            <AppIcon name="upload" :size="16" />
            提交第一支影片
          </NuxtLink>
          <NuxtLink v-else class="btn btn-primary btn-lg" to="/register">
            创建账户，等待开场
          </NuxtLink>
          <NuxtLink class="btn btn-ghost btn-lg" to="/videos">
            浏览片库
          </NuxtLink>
        </div>
      </section>

      <div v-if="data?.loadError" class="load-warning">
        <AppIcon name="alert" :size="15" />
        {{ data.loadError }}
        <button type="button" @click="refresh()">重试</button>
      </div>

      <section v-if="continueWatching.length" class="section continue-section">
        <SectionHeading kicker="PICK UP WHERE YOU LEFT" title="继续观看" link-to="/history" link-label="全部历史" />
        <div class="continue-grid">
          <NuxtLink
            v-for="item in continueWatching"
            :key="item.id"
            class="continue-card"
            :to="`/videos/${item.video.id}`"
          >
            <span class="continue-cover">
              <img v-if="item.video.coverUrl" :src="item.video.coverUrl" :alt="item.video.title" loading="lazy">
              <span v-else class="continue-fallback">{{ [...item.video.title][0] || '光' }}</span>
              <span class="continue-play"><AppIcon name="play" :size="15" /></span>
              <span class="continue-progress"><i :style="{ width: `${progressPercent(item.progressSeconds, item.durationSeconds)}%` }" /></span>
            </span>
            <span class="continue-copy">
              <strong>{{ item.video.title }}</strong>
              <small>{{ Math.round(progressPercent(item.progressSeconds, item.durationSeconds)) }}% · {{ item.completed ? '已看完' : '继续放映' }}</small>
            </span>
          </NuxtLink>
        </div>
      </section>

      <section class="section category-section">
        <div class="category-bar">
          <div class="category-intro">
            <span class="section-kicker">FIND YOUR FRAME</span>
            <h2 class="category-title">今晚想看什么</h2>
          </div>
          <div class="category-scroll">
            <NuxtLink class="chip" to="/videos">全部影片</NuxtLink>
            <NuxtLink
              v-for="category in categories"
              :key="category.id"
              class="chip"
              :to="`/videos?categoryId=${category.id}`"
            >
              {{ category.name }}
              <span v-if="category._count?.videos" class="chip-count">{{ category._count.videos }}</span>
            </NuxtLink>
          </div>
        </div>
      </section>

      <SiteMarquee class="section marquee-section" />

      <section class="section">
        <SectionHeading kicker="NOW SCREENING" title="正在放映" link-to="/videos" link-label="进入片库">
          <NuxtLink class="section-head__link" to="/videos?sort=latest">
            更多新片
            <AppIcon name="arrowRight" :size="14" />
          </NuxtLink>
        </SectionHeading>

        <div class="main-grid">
          <div>
            <VideoGrid v-if="pending" :videos="[]" loading :skeleton-count="8" />
            <VideoGrid v-else-if="gridVideos.length" :videos="gridVideos" />
            <EmptyState
              v-else
              title="片库还在等待第一束光"
              text="上传一支影片，让它出现在这块银幕上。"
              icon="film"
            >
              <NuxtLink v-if="auth.canUpload.value" class="btn btn-primary btn-sm" to="/upload">上传影片</NuxtLink>
              <NuxtLink v-else class="btn btn-ghost btn-sm" to="/videos">刷新看看</NuxtLink>
            </EmptyState>
          </div>

          <RankingList v-if="popular.length" :videos="popular" />
          <aside v-else class="ranking-empty panel">
            <AppIcon name="star" :size="20" />
            <p>热度榜将在有影片后点亮。</p>
          </aside>
        </div>
      </section>

      <section v-if="collectionCategories.length" class="section">
        <SectionHeading kicker="CURATED UNITS" title="放映单元" link-to="/videos" link-label="全部片单" />
        <div class="collection-grid">
          <NuxtLink
            v-for="(category, index) in collectionCategories"
            :key="category.id"
            class="collection-card"
            :style="{ '--collection-hue': collectionHues[index % collectionHues.length] }"
            :to="`/videos?categoryId=${category.id}`"
          >
            <span class="collection-index">0{{ index + 1 }}</span>
            <span class="collection-glow" aria-hidden="true" />
            <span class="collection-copy">
              <small>SCREENING UNIT</small>
              <strong>{{ category.name }}</strong>
              <span>{{ category.description || '一束光，一种观看方式。' }}</span>
            </span>
            <span class="collection-meta">
              {{ category._count?.videos || 0 }} 部影片
              <AppIcon name="arrowRight" :size="14" />
            </span>
          </NuxtLink>
        </div>
      </section>

      <section v-if="tags.length" class="section tag-section">
        <div class="tag-head">
          <span class="section-kicker">BROWSE BY FEELING</span>
          <span class="tag-head-note">按情绪、题材或一种感觉去找片</span>
        </div>
        <div class="tag-cloud">
          <NuxtLink v-for="tag in tags" :key="tag.id" class="tag-chip" :to="`/videos?tagId=${tag.id}`">
            <span>#</span>{{ tag.name }}
            <small v-if="tag._count?.videos">{{ tag._count.videos }}</small>
          </NuxtLink>
        </div>
      </section>

      <section class="section upload-banner">
        <div class="upload-banner-glow" aria-hidden="true" />
        <div class="upload-banner-copy">
          <span class="section-kicker">FOR FILMMAKERS</span>
          <h2 class="upload-banner-title">如果你也拍下了什么，<br>把它放进光里。</h2>
          <p>获得上传权限的创作者可以提交影片，经审核后在补档公开放映。</p>
        </div>
        <div class="upload-banner-actions">
          <NuxtLink v-if="auth.canUpload.value" class="btn btn-primary" to="/upload">
            <AppIcon name="upload" :size="15" />
            提交影片
          </NuxtLink>
          <NuxtLink v-else-if="auth.user.value" class="btn btn-ghost" to="/account">
            查看上传权限
          </NuxtLink>
          <NuxtLink v-else class="btn btn-ghost" to="/register">
            加入创作者
          </NuxtLink>
          <NuxtLink class="btn btn-subtle" to="/videos">
            浏览片库
            <AppIcon name="arrowRight" :size="14" />
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding-top: clamp(8px, 2vw, 22px);
}

.hero-empty {
  position: relative;
  display: grid;
  justify-items: start;
  min-height: min(70vh, 620px);
  align-content: center;
  gap: 22px;
  overflow: hidden;
  padding: clamp(30px, 5vw, 70px) 0;
}
.hero-empty-glow {
  position: absolute;
  top: -30%;
  right: -10%;
  width: 70vw;
  height: 70vw;
  max-width: 900px;
  max-height: 900px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(243, 184, 95, 0.13), transparent 64%);
  filter: blur(20px);
  pointer-events: none;
}
.hero-empty > * {
  position: relative;
}
.hero-empty .display-title {
  max-width: 8em;
}
.hero-empty .display-title em {
  color: var(--amber);
  font-style: normal;
}
.hero-empty-text {
  max-width: 32em;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
}
.hero-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.load-warning {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 18px;
  padding: 11px 14px;
  border: 1px solid rgba(255, 123, 111, 0.24);
  border-radius: 10px;
  color: #ffb0a6;
  background: rgba(255, 123, 111, 0.07);
  font-size: 11.5px;
}
.load-warning button {
  margin-left: auto;
  padding: 3px 9px;
  border: 1px solid currentColor;
  border-radius: 99px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
}

.continue-section {
  margin-top: 10px;
}
.continue-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.continue-card {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(15, 18, 24, 0.5);
  transition: 180ms ease;
}
.continue-card:hover {
  border-color: var(--line-strong);
  background: rgba(243, 239, 228, 0.035);
}
.continue-cover {
  position: relative;
  width: 82px;
  height: 52px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 7px;
  background: var(--surface-2);
}
.continue-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.continue-fallback {
  display: grid;
  height: 100%;
  place-items: center;
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 22px;
  background: linear-gradient(140deg, #20242c, #0b0d12);
}
.continue-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #171208;
  background: rgba(5, 6, 9, 0.28);
}
.continue-play :deep(svg) {
  display: grid;
  width: 25px;
  height: 25px;
  padding: 6px;
  border-radius: 50%;
  background: var(--amber);
  box-sizing: content-box;
}
.continue-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: rgba(243, 239, 228, 0.2);
}
.continue-progress i {
  display: block;
  height: 100%;
  background: var(--amber);
}
.continue-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.continue-copy strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.continue-copy small {
  color: var(--muted);
  font-size: 9px;
}

.category-section {
  margin-top: clamp(40px, 5vw, 64px);
}
.category-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 26px;
  padding: 22px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.category-intro {
  display: grid;
  flex: 0 0 auto;
  gap: 5px;
}
.category-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.category-scroll {
  display: flex;
  overflow-x: auto;
  gap: 8px;
  scrollbar-width: none;
}
.category-scroll::-webkit-scrollbar {
  display: none;
}
.chip-count {
  margin-left: 2px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
}
.chip:hover .chip-count {
  color: var(--muted);
}

.marquee-section {
  margin-top: clamp(40px, 5vw, 64px);
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: clamp(26px, 3.4vw, 46px);
  align-items: start;
}

.ranking-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--muted);
  text-align: center;
  font-size: 11px;
}
.ranking-empty :deep(svg) {
  color: var(--amber);
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.collection-card {
  position: relative;
  display: flex;
  min-height: 190px;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background:
    radial-gradient(circle at 84% 12%, hsl(var(--collection-hue) 55% 50% / 0.3), transparent 48%),
    linear-gradient(145deg, hsl(var(--collection-hue) 30% 16%), #0b0d12 74%);
  transition: transform 320ms var(--ease-out), border-color 220ms ease;
}
.collection-card:hover {
  border-color: var(--line-strong);
  transform: translateY(-5px);
}
.collection-index {
  position: relative;
  z-index: 1;
  color: rgba(243, 239, 228, 0.42);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
}
.collection-glow {
  position: absolute;
  top: 20%;
  right: -20%;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: hsl(var(--collection-hue) 60% 55% / 0.24);
  filter: blur(30px);
}
.collection-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 7px;
}
.collection-copy small {
  color: rgba(243, 239, 228, 0.45);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.16em;
}
.collection-copy strong {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.collection-copy span {
  overflow: hidden;
  color: rgba(243, 239, 228, 0.55);
  font-size: 10px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.collection-meta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(243, 239, 228, 0.12);
  color: rgba(243, 239, 228, 0.6);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.04em;
}

.tag-section {
  display: grid;
  gap: 16px;
}
.tag-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  padding-top: 26px;
  border-top: 1px solid var(--line);
}
.tag-head-note {
  color: var(--muted);
  font-size: 10.5px;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 13px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--ink-soft);
  font-size: 11.5px;
  transition: 170ms ease;
}
.tag-chip span {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 10px;
}
.tag-chip small {
  margin-left: 3px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
}
.tag-chip:hover {
  border-color: rgba(243, 184, 95, 0.3);
  color: var(--amber-bright);
  background: rgba(243, 184, 95, 0.06);
}

.upload-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  overflow: hidden;
  padding: clamp(28px, 4vw, 48px);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 80% 10%, rgba(243, 184, 95, 0.1), transparent 42%),
    linear-gradient(140deg, rgba(243, 239, 228, 0.04), transparent 50%),
    rgba(15, 18, 24, 0.55);
}
.upload-banner-glow {
  position: absolute;
  top: -60%;
  right: 8%;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: rgba(243, 184, 95, 0.08);
  filter: blur(50px);
}
.upload-banner-copy {
  position: relative;
  display: grid;
  gap: 13px;
  max-width: 560px;
}
.upload-banner-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 3.6vw, 44px);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.15;
}
.upload-banner-copy p {
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.75;
}
.upload-banner-actions {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 9px;
}

@media (max-width: 1180px) {
  .continue-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .main-grid {
    grid-template-columns: minmax(0, 1fr) 280px;
  }
  .collection-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 880px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  .main-grid aside {
    order: -1;
  }
  .category-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }
  .category-scroll {
    width: 100%;
  }
  .upload-banner {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .continue-grid {
    grid-template-columns: 1fr;
  }
  .collection-grid {
    grid-template-columns: 1fr;
  }
  .collection-card {
    min-height: 160px;
  }
  .tag-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .upload-banner-actions {
    width: 100%;
  }
  .upload-banner-actions .btn {
    flex: 1;
  }
}
</style>
