<script setup lang="ts">
import { computed } from 'vue'
import type { AdminUser, Category, Video } from '~/types'
import { formatDate, relativeTime, VIDEO_STATUS_LABEL, videoStatusTone } from '~/utils/format'

definePageMeta({ layout: 'admin' })

const auth = useAuth()
const { user } = auth
const videoApi = useVideoApi()

const { data, pending, error, refresh } = await useAsyncData('admin-overview', async () => {
  const [pendingResult, publishedResult, usersResult, categoriesResult, recentResult] = await Promise.allSettled([
    videoApi.listReviewQueue({ page: 1, pageSize: 5, status: 'PENDING' }),
    videoApi.listReviewQueue({ page: 1, pageSize: 1, status: 'PUBLISHED' }),
    videoApi.listUsers({ page: 1, pageSize: 1 }),
    videoApi.listCategories(1, 100),
    videoApi.listReviewQueue({ page: 1, pageSize: 4, status: 'PUBLISHED' }),
  ])
  return {
    pending: pendingResult.status === 'fulfilled' ? pendingResult.value : { items: [] as Video[], total: 0, page: 1, pageSize: 5, totalPages: 0 },
    publishedTotal: publishedResult.status === 'fulfilled' ? publishedResult.value.total : 0,
    usersTotal: usersResult.status === 'fulfilled' ? usersResult.value.total : 0,
    categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.items : [] as Category[],
    recent: recentResult.status === 'fulfilled' ? recentResult.value : { items: [] as Video[], total: 0, page: 1, pageSize: 4, totalPages: 0 },
  }
}, {
  default: () => ({
    pending: { items: [] as Video[], total: 0, page: 1, pageSize: 5, totalPages: 0 },
    publishedTotal: 0,
    usersTotal: 0,
    categories: [] as Category[],
    recent: { items: [] as Video[], total: 0, page: 1, pageSize: 4, totalPages: 0 },
  }),
})

const pendingItems = computed(() => data.value?.pending.items ?? [])
const recentItems = computed(() => data.value?.recent.items ?? [])
const stats = computed(() => [
  {
    label: '待审核影片',
    value: data.value?.pending.total ?? 0,
    note: '等待第一束光',
    icon: 'clock',
    to: '/admin/review',
    tone: 'amber',
  },
  {
    label: '已发布影片',
    value: data.value?.publishedTotal ?? 0,
    note: '正在公开放映',
    icon: 'film',
    to: '/admin/review?status=PUBLISHED',
    tone: 'green',
  },
  {
    label: '注册用户',
    value: data.value?.usersTotal ?? 0,
    note: '观众与创作者',
    icon: 'users',
    to: '/admin/users',
    tone: 'blue',
  },
  {
    label: '分类单元',
    value: data.value?.categories.length ?? 0,
    note: '放映单元',
    icon: 'layers',
    to: '/admin/taxonomy',
    tone: 'rose',
  },
])

useSeoMeta({ title: '管理概览', description: '光影放映控制室概览。' })
</script>

<template>
  <div class="admin-page">
    <header class="admin-head">
      <div>
        <span class="eyebrow">CONTROL ROOM · 放映控制室</span>
        <h1>今晚的银幕</h1>
        <p>你好，{{ user?.nickname || user?.username }}。这里是光影的放映控制室。</p>
      </div>
      <div class="admin-head-actions">
        <button class="btn btn-ghost btn-sm" type="button" @click="refresh()">
          <AppIcon name="refresh" :size="13" />
          刷新
        </button>
        <NuxtLink class="btn btn-primary btn-sm" to="/admin/review">
          <AppIcon name="film" :size="14" />
          去审核
        </NuxtLink>
      </div>
    </header>

    <div v-if="error" class="form-error">{{ error.message }}</div>

    <div class="stat-grid">
      <NuxtLink v-for="stat in stats" :key="stat.label" class="stat-card" :class="`stat-card--${stat.tone}`" :to="stat.to">
        <div class="stat-top">
          <span class="stat-icon"><AppIcon :name="stat.icon" :size="18" /></span>
          <AppIcon name="arrowRight" :size="14" class="stat-arrow" />
        </div>
        <strong class="stat-value">{{ stat.value }}</strong>
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-note">{{ stat.note }}</span>
      </NuxtLink>
    </div>

    <div class="overview-grid">
      <div class="overview-main">
      <section class="pending-panel panel">
        <header class="panel-head">
          <div>
            <span class="section-kicker">REVIEW QUEUE</span>
            <h2 class="panel-title">等待审核</h2>
          </div>
          <NuxtLink class="section-head__link" to="/admin/review">
            全部队列
            <AppIcon name="arrowRight" :size="13" />
          </NuxtLink>
        </header>
        <div class="panel-body pending-body">
          <div v-if="pending" class="pending-skeletons">
            <div v-for="index in 3" :key="index" class="skeleton" style="height: 62px; border-radius: 9px;" />
          </div>
          <div v-else-if="pendingItems.length" class="pending-list">
            <NuxtLink v-for="video in pendingItems" :key="video.id" class="pending-row" :to="`/videos/${video.id}`">
              <span class="pending-thumb">
                <img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" loading="lazy">
                <span v-else>{{ [...video.title][0] || '光' }}</span>
              </span>
              <span class="pending-copy">
                <strong>{{ video.title }}</strong>
                <small>{{ video.uploader?.nickname || video.uploader?.username || '未知创作者' }} · {{ relativeTime(video.createdAt) }}</small>
              </span>
              <span class="badge badge--amber">{{ VIDEO_STATUS_LABEL[video.status] }}</span>
            </NuxtLink>
          </div>
          <div v-else class="pending-empty">
            <AppIcon name="check" :size="22" />
            <p>审核队列已经清空。今晚没有影片需要处理。</p>
          </div>
        </div>
      </section>

      <section class="recent-published panel">
        <header class="panel-head">
          <div>
            <span class="section-kicker">NOW SCREENING</span>
            <h2 class="panel-title">最近上线</h2>
          </div>
          <NuxtLink class="section-head__link" :to="'/admin/review?status=PUBLISHED'">
            已发布片单
            <AppIcon name="arrowRight" :size="13" />
          </NuxtLink>
        </header>
        <div class="panel-body pending-body">
          <div v-if="recentItems.length" class="pending-list">
            <NuxtLink v-for="video in recentItems" :key="video.id" class="pending-row" :to="`/videos/${video.id}`">
              <span class="pending-thumb">
                <img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" loading="lazy">
                <span v-else>{{ [...video.title][0] || '光' }}</span>
              </span>
              <span class="pending-copy">
                <strong>{{ video.title }}</strong>
                <small>{{ video.uploader?.nickname || video.uploader?.username || '未知创作者' }} · {{ relativeTime(video.publishedAt || video.createdAt) }}</small>
              </span>
              <AppIcon name="chevronRight" :size="14" class="recent-arrow" />
            </NuxtLink>
          </div>
          <div v-else class="pending-empty">
            <AppIcon name="film" :size="22" />
            <p>还没有已发布影片。</p>
          </div>
        </div>
      </section>
      </div>

      <aside class="side-stack">
        <section class="quick-panel panel">
          <header class="panel-head">
            <div>
              <span class="section-kicker">QUICK ACTIONS</span>
              <h2 class="panel-title">常用操作</h2>
            </div>
          </header>
          <div class="panel-body quick-list">
            <NuxtLink to="/admin/durations">
              <span><AppIcon name="clock" :size="16" />时长校准</span>
              <AppIcon name="chevronRight" :size="14" />
            </NuxtLink>
            <NuxtLink to="/admin/users">
              <span><AppIcon name="users" :size="16" />用户与上传权限</span>
              <AppIcon name="chevronRight" :size="14" />
            </NuxtLink>
            <NuxtLink to="/admin/taxonomy">
              <span><AppIcon name="layers" :size="16" />分类与标签</span>
              <AppIcon name="chevronRight" :size="14" />
            </NuxtLink>
            <NuxtLink to="/admin/configs">
              <span><AppIcon name="sliders" :size="16" />站点配置</span>
              <AppIcon name="chevronRight" :size="14" />
            </NuxtLink>
            <a href="/" target="_blank" rel="noopener">
              <span><AppIcon name="external" :size="16" />打开前台</span>
              <AppIcon name="chevronRight" :size="14" />
            </a>
          </div>
        </section>

        <section class="categories-panel panel">
          <header class="panel-head">
            <div>
              <span class="section-kicker">SCREENING UNITS</span>
              <h2 class="panel-title">放映单元</h2>
            </div>
          </header>
          <div class="panel-body category-list">
            <div v-for="category in data?.categories.slice(0, 6)" :key="category.id" class="category-row">
              <span>{{ category.name }}</span>
              <span class="category-count">{{ category._count?.videos || 0 }}</span>
            </div>
            <p v-if="!data?.categories.length" class="muted">还没有分类。</p>
          </div>
        </section>
      </aside>
    </div>

    <section class="recent-panel panel">
      <header class="panel-head">
        <div>
          <span class="section-kicker">PUBLISHED RADAR</span>
          <h2 class="panel-title">最近的放映状态</h2>
        </div>
        <span class="panel-sub">数据来自后端实时查询</span>
      </header>
      <div class="panel-body recent-body">
        <p>
          审核通过后影片会立即出现在前台片库；被驳回的影片会通知作者，并可在「我的影片」中修改后重新提交。
        </p>
        <div class="recent-hints">
          <span><i class="dot dot--green" />{{ data?.publishedTotal ?? 0 }} 部正在放映</span>
          <span><i class="dot dot--amber" />{{ data?.pending.total ?? 0 }} 部等待审核</span>
          <span><i class="dot dot--muted" />{{ data?.usersTotal ?? 0 }} 位观众</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 24px;
}

.admin-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 26px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}
.admin-head > div:first-child {
  display: grid;
  gap: 9px;
}
.admin-head h1 {
  font-family: var(--font-display);
  font-size: clamp(38px, 4.6vw, 56px);
  font-weight: 400;
  letter-spacing: -0.035em;
  line-height: 1;
}
.admin-head p {
  color: var(--muted);
  font-size: 11.5px;
}
.admin-head-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 7px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.stat-card {
  position: relative;
  display: grid;
  gap: 5px;
  padding: 17px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(243, 239, 228, 0.035), transparent 45%),
    rgba(15, 18, 24, 0.55);
  transition: transform 220ms var(--ease-out), border-color 180ms ease;
}
.stat-card:hover {
  border-color: var(--line-strong);
  transform: translateY(-3px);
}
.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}
.stat-icon {
  display: grid;
  width: 33px;
  height: 33px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--amber);
  background: var(--amber-soft);
}
.stat-card--green .stat-icon {
  color: var(--success);
  background: rgba(146, 214, 164, 0.09);
}
.stat-card--blue .stat-icon {
  color: var(--blue);
  background: rgba(139, 180, 255, 0.08);
}
.stat-card--rose .stat-icon {
  color: var(--rose);
  background: rgba(224, 107, 128, 0.08);
}
.stat-arrow {
  color: var(--muted-weak);
  opacity: 0;
  transform: translateX(-4px);
  transition: 160ms ease;
}
.stat-card:hover .stat-arrow {
  opacity: 1;
  transform: translateX(0);
}
.stat-value {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 35px;
  font-weight: 400;
  line-height: 1;
}
.stat-label {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
}
.stat-note {
  color: var(--muted-weak);
  font-size: 9px;
}

.overview-main {
  display: grid;
  gap: 14px;
  align-self: start;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.7fr);
  gap: 14px;
  align-items: start;
}

.pending-body {
  padding-top: 8px;
}
.pending-list {
  display: grid;
}
.pending-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 0;
  border-bottom: 1px solid var(--line);
}
.pending-row:last-child {
  border-bottom: 0;
}
.pending-thumb {
  display: grid;
  width: 76px;
  height: 47px;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--muted);
  background: var(--surface-2);
  font-family: var(--font-display);
  font-size: 21px;
}
.pending-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pending-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 2px;
}
.pending-copy strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pending-copy small {
  color: var(--muted-weak);
  font-size: 9px;
}
.pending-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 34px 16px;
  color: var(--muted);
  text-align: center;
  font-size: 10.5px;
}
.pending-empty :deep(svg) {
  color: var(--success);
}
.pending-skeletons {
  display: grid;
  gap: 8px;
}

.side-stack {
  display: grid;
  gap: 14px;
}
.quick-list {
  display: grid;
  gap: 3px;
  padding-top: 8px;
}
.quick-list a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 9px;
  border-radius: 8px;
  color: var(--ink-soft);
  font-size: 10.5px;
  transition: 150ms ease;
}
.quick-list a:hover {
  background: rgba(243, 239, 228, 0.05);
}
.quick-list a span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.quick-list a :deep(svg) {
  color: var(--muted);
}
.quick-list a:hover :deep(svg) {
  color: var(--amber);
}
.category-list {
  display: grid;
  gap: 0;
  padding-top: 8px;
}
.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 10.5px;
}
.category-row:last-child {
  border-bottom: 0;
}
.category-count {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.recent-panel {
  margin-top: 2px;
}
.panel-sub {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
}
.recent-body p {
  max-width: 760px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.8;
}
.recent-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 15px;
  color: var(--muted);
  font-size: 10px;
}
.recent-hints span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dot--green { background: var(--success); }
.dot--amber { background: var(--amber); }
.dot--muted { background: var(--muted); }

@media (max-width: 1120px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .admin-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
}
</style>
