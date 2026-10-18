<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Category, TagItem, Video } from '~/types'

const route = useRoute()
const router = useRouter()
const videoApi = useVideoApi()
const siteSettings = useSiteSettings()

type SortOption = 'latest' | 'popular' | 'likes' | 'comments'

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '最热' },
  { value: 'likes', label: '最多喜欢' },
  { value: 'comments', label: '最多讨论' },
]

const keywordInput = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')

const queryNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

const state = computed(() => ({
  page: queryNumber(route.query.page) ?? 1,
  keyword: typeof route.query.keyword === 'string' ? route.query.keyword : '',
  categoryId: queryNumber(route.query.categoryId),
  tagId: queryNumber(route.query.tagId),
  sort: (['latest', 'popular', 'likes', 'comments'].includes(String(route.query.sort))
    ? String(route.query.sort)
    : 'latest') as SortOption,
}))

const { data: taxonomy } = await useAsyncData('video-browse-taxonomy', async () => {
  const [categoriesResult, tagsResult] = await Promise.allSettled([
    videoApi.listCategories(1, 100),
    videoApi.listTags(1, 40),
  ])
  return {
    categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.items : [] as Category[],
    tags: tagsResult.status === 'fulfilled' ? tagsResult.value.items : [] as TagItem[],
  }
}, {
  default: () => ({ categories: [] as Category[], tags: [] as TagItem[] }),
})

const { data: result, pending, error, refresh } = await useAsyncData('video-browse-list', () => {
  return videoApi.listVideos({
    page: state.value.page,
    pageSize: 16,
    keyword: state.value.keyword || undefined,
    categoryId: state.value.categoryId,
    tagId: state.value.tagId,
    sort: state.value.sort,
  })
}, {
  watch: [state],
  default: () => ({ items: [] as Video[], total: 0, page: 1, pageSize: 16, totalPages: 0 }),
})

const categories = computed(() => taxonomy.value?.categories ?? [])
const tags = computed(() => taxonomy.value?.tags ?? [])
const videos = computed(() => result.value?.items ?? [])
const activeCategory = computed(() => categories.value.find(category => category.id === state.value.categoryId) || null)
const activeTag = computed(() => tags.value.find(tag => tag.id === state.value.tagId) || null)
const hasFilters = computed(() => Boolean(state.value.keyword || state.value.categoryId || state.value.tagId))

const pageTitle = computed(() => {
  if (activeCategory.value) return activeCategory.value.name
  if (activeTag.value) return `#${activeTag.value.name}`
  if (state.value.keyword) return `搜索「${state.value.keyword}」`
  return '全部影片'
})

const pageDescription = computed(() => activeCategory.value?.description
  || (activeTag.value ? `被标记为「${activeTag.value.name}」的影像。` : '一束光，一种观看方式。按主题、热度或心情找到下一部影片。'))

useSeoMeta({
  title: () => `${pageTitle.value} · 片库`,
  description: () => `${pageDescription.value} ${siteSettings.value.name}片库。`,
})

watch(() => route.query, () => {
  keywordInput.value = typeof route.query.keyword === 'string' ? route.query.keyword : ''
})

function updateQuery(patch: Record<string, string | number | null | undefined>, resetPage = true) {
  const next: Record<string, string | number> = {}
  const base = { ...route.query, ...patch }
  for (const [key, value] of Object.entries(base)) {
    if (key === 'page') continue
    if (value !== undefined && value !== null && value !== '') next[key] = String(value)
  }
  const targetPage = resetPage ? 1 : Number(patch.page ?? state.value.page ?? 1)
  if (targetPage > 1) next.page = String(targetPage)
  void router.push({ path: '/videos', query: next })
}

function goPage(page: number) {
  updateQuery({ page }, false)
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

function submitSearch() {
  updateQuery({ keyword: keywordInput.value.trim() || undefined })
}

function clearFilters() {
  keywordInput.value = ''
  void router.push({ path: '/videos' })
}
</script>

<template>
  <div class="page browse-page">
    <div class="container">
      <header class="browse-head">
        <div class="browse-heading">
          <span class="eyebrow">THE FILM ARCHIVE</span>
          <h1 class="browse-title">{{ pageTitle }}</h1>
          <p class="browse-description">{{ pageDescription }}</p>
        </div>
        <div class="browse-stat">
          <strong>{{ result?.total ?? 0 }}</strong>
          <span>部影片在架</span>
        </div>
      </header>

      <div class="browse-toolbar">
        <form class="browse-search" role="search" @submit.prevent="submitSearch">
          <AppIcon name="search" :size="16" />
          <input
            v-model="keywordInput"
            type="search"
            placeholder="搜索片名、简介或标签"
            aria-label="搜索片库"
          >
          <button class="browse-search-btn" type="submit">搜索</button>
        </form>

        <div class="sort-control">
          <span>排序</span>
          <div class="segmented">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              :class="{ 'is-active': state.sort === option.value }"
              @click="updateQuery({ sort: option.value })"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="filter-block">
        <div class="filter-row">
          <span class="filter-label">类型</span>
          <div class="filter-items">
            <button class="chip" :class="{ 'is-active': !state.categoryId }" type="button" @click="updateQuery({ categoryId: undefined })">
              全部
            </button>
            <button
              v-for="category in categories"
              :key="category.id"
              class="chip"
              :class="{ 'is-active': state.categoryId === category.id }"
              type="button"
              @click="updateQuery({ categoryId: category.id })"
            >
              {{ category.name }}
            </button>
          </div>
        </div>

        <div class="filter-row">
          <span class="filter-label">标签</span>
          <div class="filter-items">
            <button class="chip" :class="{ 'is-active': !state.tagId }" type="button" @click="updateQuery({ tagId: undefined })">
              全部
            </button>
            <button
              v-for="tag in tags"
              :key="tag.id"
              class="chip"
              :class="{ 'is-active': state.tagId === tag.id }"
              type="button"
              @click="updateQuery({ tagId: tag.id })"
            >
              #{{ tag.name }}
            </button>
          </div>
        </div>

        <div v-if="hasFilters" class="filter-reset">
          <span>正在筛选</span>
          <button type="button" @click="clearFilters">
            清除全部条件
            <AppIcon name="close" :size="12" />
          </button>
        </div>
      </div>

      <div v-if="error" class="load-error">
        <AppIcon name="alert" :size="16" />
        <span>{{ error.message }}</span>
        <button type="button" @click="refresh()">重新加载</button>
      </div>

      <div class="browse-results">
        <VideoGrid v-if="pending" :videos="[]" loading :skeleton-count="8" />
        <VideoGrid v-else-if="videos.length" :videos="videos" />
        <EmptyState
          v-else
          icon="search"
          title="没有找到对应的影片"
          text="换一个关键词，或清除筛选条件，再看看别的放映单元。"
        >
          <button class="btn btn-primary btn-sm" type="button" @click="clearFilters">清除筛选</button>
        </EmptyState>
      </div>

      <PaginationBar
        v-if="!pending && (result?.totalPages ?? 0) > 1"
        :page="state.page"
        :total-pages="result?.totalPages ?? 1"
        @update:page="goPage"
      />
    </div>
  </div>
</template>

<style scoped>
.browse-page {
  padding-top: clamp(30px, 4vw, 54px);
}

.browse-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--line);
}
.browse-heading {
  display: grid;
  gap: 12px;
}
.browse-title {
  font-family: var(--font-display);
  font-size: clamp(44px, 6vw, 76px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 0.98;
}
.browse-description {
  max-width: 520px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.75;
}
.browse-stat {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 1px;
  padding-bottom: 7px;
}
.browse-stat strong {
  color: var(--amber);
  font-family: var(--font-display);
  font-size: 54px;
  font-weight: 400;
  line-height: 1;
}
.browse-stat span {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.browse-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 0;
  border-bottom: 1px solid var(--line);
}
.browse-search {
  display: flex;
  align-items: center;
  width: min(460px, 100%);
  gap: 9px;
  padding: 4px 4px 4px 14px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: rgba(12, 14, 19, 0.6);
}
.browse-search:focus-within {
  border-color: rgba(243, 184, 95, 0.36);
}
.browse-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}
.browse-search input::placeholder {
  color: var(--muted-weak);
}
.browse-search-btn {
  height: 34px;
  flex: 0 0 auto;
  padding: 0 16px;
  border-radius: 99px;
  color: #171208;
  background: var(--amber);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.sort-control {
  display: flex;
  align-items: center;
  gap: 11px;
}
.sort-control > span {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.filter-block {
  display: grid;
  gap: 13px;
  padding: 21px 0 28px;
}
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.filter-label {
  width: 40px;
  flex: 0 0 auto;
  padding-top: 9px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.14em;
}
.filter-items {
  display: flex;
  overflow-x: auto;
  flex-wrap: wrap;
  gap: 7px;
  scrollbar-width: none;
}
.filter-items::-webkit-scrollbar {
  display: none;
}
.filter-items .chip {
  min-height: 31px;
  padding: 0 12px;
  font-size: 11px;
}
.filter-reset {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 56px;
  color: var(--muted);
  font-size: 10px;
}
.filter-reset button {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--amber);
  background: transparent;
  font-size: 10px;
  cursor: pointer;
}

.load-error {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 22px;
  padding: 11px 14px;
  border: 1px solid rgba(255, 123, 111, 0.24);
  border-radius: 10px;
  color: #ffb0a6;
  background: rgba(255, 123, 111, 0.07);
  font-size: 11.5px;
}
.load-error button {
  margin-left: auto;
  border: 1px solid currentColor;
  border-radius: 99px;
  padding: 3px 9px;
  color: inherit;
  background: transparent;
  font-size: 10px;
  cursor: pointer;
}

.browse-results {
  padding-top: 8px;
}

@media (max-width: 840px) {
  .browse-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }
  .browse-stat {
    justify-items: start;
    flex-direction: row;
    align-items: baseline;
    gap: 7px;
  }
  .browse-stat strong {
    font-size: 34px;
  }
  .browse-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }
  .sort-control {
    justify-content: space-between;
  }
  .filter-row {
    flex-direction: column;
    gap: 8px;
  }
  .filter-label {
    padding-top: 0;
  }
  .filter-reset {
    padding-left: 0;
  }
}
</style>
