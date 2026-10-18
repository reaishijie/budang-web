<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Category, TagItem } from '~/types'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })

const videoApi = useVideoApi()
const toast = useToast()

const { data, pending, error, refresh } = await useAsyncData('admin-taxonomy', async () => {
  const [categoriesResult, tagsResult] = await Promise.allSettled([
    videoApi.listCategories(1, 100),
    videoApi.listTags(1, 100),
  ])
  return {
    categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.items : [] as Category[],
    tags: tagsResult.status === 'fulfilled' ? tagsResult.value.items : [] as TagItem[],
  }
}, {
  default: () => ({ categories: [] as Category[], tags: [] as TagItem[] }),
})

const categories = computed(() => [...(data.value?.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id))
const tags = computed(() => data.value?.tags ?? [])
const totalVideos = computed(() => categories.value.reduce((sum, category) => sum + (category._count?.videos ?? 0), 0))

const categoryOpen = ref(false)
const categoryEditing = ref<Category | null>(null)
const savingCategory = ref(false)
const categoryForm = reactive({
  name: '',
  description: '',
  sortOrder: 0,
})

function openCategory(category?: Category) {
  categoryEditing.value = category ?? null
  categoryForm.name = category?.name ?? ''
  categoryForm.description = category?.description ?? ''
  categoryForm.sortOrder = category?.sortOrder ?? 0
  categoryOpen.value = true
}

async function saveCategory() {
  if (!categoryForm.name.trim() || savingCategory.value) {
    if (!categoryForm.name.trim()) toast.error('请填写分类名称')
    return
  }
  savingCategory.value = true
  try {
    const body = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || null,
      sortOrder: Math.max(0, Math.round(Number(categoryForm.sortOrder) || 0)),
    }
    if (categoryEditing.value) {
      await videoApi.updateCategory(categoryEditing.value.id, body)
      toast.success('分类已更新')
    } else {
      await videoApi.createCategory(body)
      toast.success('分类已创建')
    }
    categoryOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    savingCategory.value = false
  }
}

async function removeCategory(category: Category) {
  if (!import.meta.client) return
  if (!window.confirm(`确定删除分类「${category.name}」吗？关联影片的分类会被清空。`)) return
  try {
    await videoApi.deleteCategory(category.id)
    toast.success('分类已删除')
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  }
}

const newTagName = ref('')
const creatingTag = ref(false)

async function createTag() {
  if (!newTagName.value.trim() || creatingTag.value) return
  creatingTag.value = true
  try {
    await videoApi.createTag(newTagName.value.trim())
    newTagName.value = ''
    toast.success('标签已创建')
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '创建失败')
  } finally {
    creatingTag.value = false
  }
}

const tagOpen = ref(false)
const tagEditing = ref<TagItem | null>(null)
const tagName = ref('')
const savingTag = ref(false)

function openTag(tag: TagItem) {
  tagEditing.value = tag
  tagName.value = tag.name
  tagOpen.value = true
}

async function saveTag() {
  if (!tagEditing.value || !tagName.value.trim() || savingTag.value) return
  savingTag.value = true
  try {
    await videoApi.updateTag(tagEditing.value.id, tagName.value.trim())
    toast.success('标签已更新')
    tagOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    savingTag.value = false
  }
}

async function removeTag(tag: TagItem) {
  if (!import.meta.client) return
  if (!window.confirm(`确定删除标签「${tag.name}」吗？视频上的该标签会被移除。`)) return
  try {
    await videoApi.deleteTag(tag.id)
    toast.success('标签已删除')
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  }
}

useSeoMeta({ title: '分类与标签', description: '管理补档的放映分类与影片标签。' })
</script>

<template>
  <div class="admin-page">
    <header class="admin-head">
      <div>
        <span class="eyebrow">SCREENING UNITS · 分类与标签</span>
        <h1>片单的骨架</h1>
        <p>分类决定影片被放在哪个放映单元，标签帮助观众按情绪和题材找到影片。</p>
      </div>
      <div class="head-note">
        <span>{{ categories.length }} 个分类</span>
        <span>{{ tags.length }} 个标签</span>
        <span>{{ totalVideos }} 部已发布影片</span>
      </div>
    </header>

    <div v-if="error" class="form-error">{{ error.message }}</div>

    <div class="taxonomy-grid">
      <section class="taxonomy-panel panel">
        <header class="panel-head">
          <div>
            <span class="section-kicker">CATEGORIES</span>
            <h2 class="panel-title">分类</h2>
          </div>
          <button class="btn btn-primary btn-sm" type="button" @click="openCategory()">
            <AppIcon name="plus" :size="13" />
            新建分类
          </button>
        </header>
        <div class="panel-body">
          <div v-if="pending" class="taxonomy-skeletons">
            <div v-for="index in 4" :key="index" class="skeleton" style="height: 54px; border-radius: 9px;" />
          </div>
          <div v-else-if="categories.length" class="taxonomy-list">
            <article v-for="category in categories" :key="category.id" class="taxonomy-row">
              <span class="sort-badge">{{ category.sortOrder }}</span>
              <div class="taxonomy-copy">
                <strong>{{ category.name }}</strong>
                <span>{{ category.description || '未填写描述' }}</span>
              </div>
              <span class="taxonomy-count">{{ category._count?.videos || 0 }} 部</span>
              <div class="taxonomy-actions">
                <button class="row-action" type="button" @click="openCategory(category)">编辑</button>
                <button class="row-action row-action--danger" type="button" @click="removeCategory(category)">删除</button>
              </div>
            </article>
          </div>
          <div v-else class="taxonomy-empty">
            <AppIcon name="layers" :size="21" />
            <p>还没有分类。创建第一个放映单元吧。</p>
          </div>
        </div>
      </section>

      <section class="taxonomy-panel panel">
        <header class="panel-head">
          <div>
            <span class="section-kicker">TAGS</span>
            <h2 class="panel-title">标签</h2>
          </div>
        </header>
        <div class="panel-body">
          <form class="tag-create" @submit.prevent="createTag">
            <input v-model="newTagName" class="input" maxlength="50" placeholder="输入新标签名称，如：城市、胶片" aria-label="新标签名称">
            <button class="btn btn-primary btn-sm" type="submit" :disabled="!newTagName.trim() || creatingTag">
              <span v-if="creatingTag" class="spinner" />
              <AppIcon v-else name="plus" :size="13" />
              添加
            </button>
          </form>

          <div v-if="tags.length" class="tag-list">
            <div v-for="tag in tags" :key="tag.id" class="tag-row">
              <span class="tag-hash">#</span>
              <span class="tag-name">{{ tag.name }}</span>
              <span class="tag-count">{{ tag._count?.videos || 0 }}</span>
              <button class="row-action" type="button" @click="openTag(tag)">编辑</button>
              <button class="row-action row-action--danger" type="button" @click="removeTag(tag)">删除</button>
            </div>
          </div>
          <div v-else class="taxonomy-empty">
            <AppIcon name="spark" :size="21" />
            <p>还没有标签。给影片加一些关键词吧。</p>
          </div>
        </div>
      </section>
    </div>

    <ModalDialog
      :open="categoryOpen"
      :title="categoryEditing ? '编辑分类' : '新建分类'"
      description="SCREENING UNIT"
      @close="categoryOpen = false"
    >
      <form class="edit-form" @submit.prevent="saveCategory">
        <div class="field">
          <label class="field-label" for="category-name">名称</label>
          <input id="category-name" v-model="categoryForm.name" class="input" maxlength="80" required>
        </div>
        <div class="field">
          <label class="field-label" for="category-description">描述</label>
          <textarea id="category-description" v-model="categoryForm.description" class="textarea" rows="3" maxlength="500" placeholder="这个放映单元收录什么样的影片？" />
        </div>
        <div class="field">
          <label class="field-label" for="category-order">排序权重</label>
          <input id="category-order" v-model.number="categoryForm.sortOrder" class="input" type="number" min="0" max="9999">
          <span class="field-hint">数字越小越靠前。</span>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="categoryOpen = false">取消</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="savingCategory" @click="saveCategory">
          <span v-if="savingCategory" class="spinner" />
          <AppIcon v-else name="check" :size="13" />
          保存分类
        </button>
      </template>
    </ModalDialog>

    <ModalDialog
      :open="tagOpen"
      title="编辑标签"
      description="TAG"
      width="420px"
      @close="tagOpen = false"
    >
      <div class="field">
        <label class="field-label" for="tag-name">标签名称</label>
        <input id="tag-name" v-model="tagName" class="input" maxlength="50">
      </div>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="tagOpen = false">取消</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="savingTag" @click="saveTag">
          <span v-if="savingTag" class="spinner" />
          <AppIcon v-else name="check" :size="13" />
          保存标签
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 18px;
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
  font-size: clamp(36px, 4.4vw, 54px);
  font-weight: 400;
  letter-spacing: -0.035em;
  line-height: 1;
}
.admin-head p {
  max-width: 620px;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.7;
}
.head-note {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.06em;
}
.head-note span {
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 99px;
}

.taxonomy-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 14px;
  align-items: start;
}

.taxonomy-list {
  display: grid;
}
.taxonomy-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.taxonomy-row:last-child {
  border-bottom: 0;
}
.sort-badge {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
}
.taxonomy-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 2px;
}
.taxonomy-copy strong {
  font-size: 11.5px;
  font-weight: 600;
}
.taxonomy-copy span {
  overflow: hidden;
  color: var(--muted-weak);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.taxonomy-count {
  flex: 0 0 auto;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
}
.taxonomy-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.tag-create {
  display: flex;
  gap: 7px;
  margin-bottom: 13px;
}
.tag-create .input {
  min-height: 34px;
  padding: 6px 10px;
  font-size: 10.5px;
}
.tag-create .btn {
  flex: 0 0 auto;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--ink-soft);
  font-size: 9.5px;
}
.tag-hash {
  color: var(--amber);
  font-family: var(--font-mono);
}
.tag-name {
  font-weight: 600;
}
.tag-count {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
}
.tag-row .row-action {
  font-size: 8px;
}

.taxonomy-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 34px 12px;
  color: var(--muted);
  text-align: center;
  font-size: 10px;
}
.taxonomy-empty :deep(svg) {
  color: var(--amber);
  opacity: 0.75;
}
.taxonomy-skeletons {
  display: grid;
  gap: 8px;
}

.edit-form {
  display: grid;
  gap: 14px;
}

@media (max-width: 900px) {
  .taxonomy-grid {
    grid-template-columns: 1fr;
  }
  .admin-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
}
</style>
