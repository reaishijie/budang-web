<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { ConfigItem, ConfigVisibility } from '~/types'
import { formatDate } from '~/utils/format'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })

const videoApi = useVideoApi()
const toast = useToast()

const keywordInput = ref('')
const keyword = ref('')
const typeFilter = ref('')
const visibleFilter = ref<ConfigVisibility | ''>('')
const page = ref(1)

const { data, pending, error, refresh } = await useAsyncData(
  () => `admin-configs-${keyword.value}-${typeFilter.value}-${visibleFilter.value}-${page.value}`,
  () => videoApi.listConfigs({
    page: page.value,
    pageSize: 20,
    keyword: keyword.value || undefined,
    type: typeFilter.value || undefined,
    visible: visibleFilter.value || undefined,
  }),
  {
    watch: [keyword, typeFilter, visibleFilter, page],
    default: () => ({ items: [] as ConfigItem[], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
  },
)

const { data: types } = await useAsyncData('admin-config-types', () => videoApi.listConfigTypes(), {
  default: () => [] as string[],
})

const configs = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

function search() {
  keyword.value = keywordInput.value.trim()
  page.value = 1
}

function resetFilters() {
  keywordInput.value = ''
  keyword.value = ''
  typeFilter.value = ''
  visibleFilter.value = ''
  page.value = 1
}

const editOpen = ref(false)
const editingConfig = ref<ConfigItem | null>(null)
const saving = ref(false)
const editForm = reactive({
  name: '',
  v: '',
  description: '',
  visible: 'PUBLIC' as ConfigVisibility,
})

function openEdit(config: ConfigItem) {
  editingConfig.value = config
  editForm.name = config.name
  editForm.v = config.v
  editForm.description = config.description || ''
  editForm.visible = config.visible
  editOpen.value = true
}

async function saveEdit() {
  if (!editingConfig.value || saving.value) return
  saving.value = true
  try {
    await videoApi.updateConfig(editingConfig.value.id, {
      name: editForm.name.trim() || editingConfig.value.k,
      v: editForm.v,
      description: editForm.description.trim() || null,
      visible: editForm.visible,
    })
    toast.success('配置已更新')
    editOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

const createOpen = ref(false)
const creating = ref(false)
const createForm = reactive({
  type: 'APP',
  k: '',
  name: '',
  v: '',
  description: '',
  visible: 'ADMIN' as ConfigVisibility,
})

function openCreate() {
  createForm.type = typeFilter.value || 'APP'
  createForm.k = ''
  createForm.name = ''
  createForm.v = ''
  createForm.description = ''
  createForm.visible = 'ADMIN'
  createOpen.value = true
}

async function createConfig() {
  if (!createForm.type.trim() || !createForm.k.trim() || creating.value) {
    if (!createForm.k.trim()) toast.error('配置 Key 不能为空')
    return
  }
  creating.value = true
  try {
    await videoApi.createConfig({
      type: createForm.type.trim().toUpperCase(),
      k: createForm.k.trim().toUpperCase(),
      name: createForm.name.trim() || createForm.k.trim(),
      v: createForm.v,
      description: createForm.description.trim() || null,
      visible: createForm.visible,
    })
    toast.success('配置已创建')
    createOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '创建失败')
  } finally {
    creating.value = false
  }
}

async function remove(config: ConfigItem) {
  if (!import.meta.client) return
  if (!window.confirm(`确定删除配置 ${config.type}/${config.k} 吗？`)) return
  try {
    await videoApi.deleteConfig(config.id)
    toast.success('配置已删除')
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  }
}

const visibleLabels: Record<ConfigVisibility, string> = {
  PUBLIC: '公开',
  USER: '登录可见',
  ADMIN: '仅管理员',
}

useSeoMeta({ title: '站点配置', description: '管理补档站点、存储、上传与能量配置。' })
</script>

<template>
  <div class="admin-page">
    <header class="admin-head">
      <div>
        <span class="eyebrow">PROJECTION SETTINGS · 站点配置</span>
        <h1>放映参数</h1>
        <p>站点品牌、对象存储、上传限制与能量规则，都保存在配置表里。</p>
      </div>
      <button class="btn btn-primary btn-sm" type="button" @click="openCreate">
        <AppIcon name="plus" :size="13" />
        新建配置
      </button>
    </header>

    <div class="config-notice">
      <AppIcon name="shield" :size="16" />
      <span>
        敏感凭据（R2 Secret、JWT Secret 等）只能通过环境变量注入，不能写入配置表。
        Key 中包含 SECRET / TOKEN / PASSWORD / ACCESS_KEY_ID 会被后端拒绝。
      </span>
    </div>

    <div class="config-filters">
      <form class="config-search" role="search" @submit.prevent="search">
        <AppIcon name="search" :size="14" />
        <input v-model="keywordInput" type="search" placeholder="搜索名称、Key 或说明" aria-label="搜索配置">
        <button type="submit">搜索</button>
      </form>
      <div class="filter-selects">
        <select v-model="typeFilter" class="select select-sm" aria-label="筛选配置类型">
          <option value="">全部类型</option>
          <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
        </select>
        <select v-model="visibleFilter" class="select select-sm" aria-label="筛选可见范围">
          <option value="">全部可见范围</option>
          <option value="PUBLIC">公开</option>
          <option value="USER">登录可见</option>
          <option value="ADMIN">仅管理员</option>
        </select>
        <button class="btn btn-ghost btn-sm" type="button" @click="resetFilters">重置</button>
      </div>
    </div>

    <div class="config-meta">
      <span>{{ total }} 项配置</span>
      <span>修改后立即生效，部分缓存需刷新页面</span>
    </div>

    <div v-if="error" class="form-error">{{ error.message }}</div>

    <div class="table-shell">
      <table class="data-table config-table">
        <thead>
          <tr>
            <th>类型 / Key</th>
            <th>名称</th>
            <th>值</th>
            <th>可见范围</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="6" class="table-loading">正在读取配置…</td>
          </tr>
          <template v-else>
          <tr v-for="config in configs" :key="config.id">
            <td>
              <div class="config-key">
                <span class="config-type">{{ config.type }}</span>
                <code>{{ config.k }}</code>
              </div>
            </td>
            <td>
              <div class="config-name">{{ config.name }}</div>
              <div v-if="config.description" class="config-desc">{{ config.description }}</div>
            </td>
            <td><code class="config-value">{{ config.v || '（空）' }}</code></td>
            <td>
              <span class="badge" :class="config.visible === 'PUBLIC' ? 'badge--green' : config.visible === 'USER' ? 'badge--amber' : 'badge--muted'">
                {{ visibleLabels[config.visible] }}
              </span>
            </td>
            <td class="date-cell">{{ formatDate(config.updatedAt, true) }}</td>
            <td>
              <div class="row-actions">
                <button class="row-action" type="button" @click="openEdit(config)">编辑</button>
                <button class="row-action row-action--danger" type="button" @click="remove(config)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!configs.length">
            <td colspan="6" class="table-empty">没有符合条件的配置。</td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>

    <PaginationBar
      v-if="(data?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="data?.totalPages ?? 1"
      @update:page="(value) => { page = value }"
    />

    <ModalDialog
      :open="editOpen"
      title="编辑配置"
      :description="editingConfig ? `${editingConfig.type} / ${editingConfig.k}` : ''"
      width="620px"
      @close="editOpen = false"
    >
      <form class="edit-form" @submit.prevent="saveEdit">
        <div class="field">
          <label class="field-label" for="config-name">展示名称</label>
          <input id="config-name" v-model="editForm.name" class="input" maxlength="100">
        </div>
        <div class="field">
          <label class="field-label" for="config-value">值</label>
          <textarea id="config-value" v-model="editForm.v" class="textarea textarea-mono" rows="6" />
          <span class="field-hint">修改后会立即影响使用该配置的接口。</span>
        </div>
        <div class="field">
          <label class="field-label" for="config-description">说明</label>
          <input id="config-description" v-model="editForm.description" class="input" maxlength="500">
        </div>
        <div class="field">
          <label class="field-label" for="config-visible">可见范围</label>
          <select id="config-visible" v-model="editForm.visible" class="select">
            <option value="PUBLIC">PUBLIC · 匿名可见</option>
            <option value="USER">USER · 登录可见</option>
            <option value="ADMIN">ADMIN · 仅管理员</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="editOpen = false">取消</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="saving" @click="saveEdit">
          <span v-if="saving" class="spinner" />
          <AppIcon v-else name="check" :size="13" />
          保存配置
        </button>
      </template>
    </ModalDialog>

    <ModalDialog
      :open="createOpen"
      title="新建配置"
      description="NEW CONFIG"
      width="620px"
      @close="createOpen = false"
    >
      <form class="edit-form" @submit.prevent="createConfig">
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="new-config-type">类型</label>
            <input id="new-config-type" v-model="createForm.type" class="input" maxlength="50" placeholder="APP / STORAGE / UPLOAD…">
          </div>
          <div class="field">
            <label class="field-label" for="new-config-key">Key</label>
            <input id="new-config-key" v-model="createForm.k" class="input" maxlength="100" placeholder="SITE_TAGLINE">
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="new-config-name">展示名称</label>
          <input id="new-config-name" v-model="createForm.name" class="input" maxlength="100" placeholder="不填则使用 Key">
        </div>
        <div class="field">
          <label class="field-label" for="new-config-value">值</label>
          <textarea id="new-config-value" v-model="createForm.v" class="textarea textarea-mono" rows="4" />
        </div>
        <div class="field">
          <label class="field-label" for="new-config-description">说明</label>
          <input id="new-config-description" v-model="createForm.description" class="input" maxlength="500">
        </div>
        <div class="field">
          <label class="field-label" for="new-config-visible">可见范围</label>
          <select id="new-config-visible" v-model="createForm.visible" class="select">
            <option value="PUBLIC">PUBLIC · 匿名可见</option>
            <option value="USER">USER · 登录可见</option>
            <option value="ADMIN">ADMIN · 仅管理员</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="createOpen = false">取消</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="creating" @click="createConfig">
          <span v-if="creating" class="spinner" />
          <AppIcon v-else name="plus" :size="13" />
          创建配置
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 17px;
}
.admin-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}
.admin-head > div {
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
  max-width: 650px;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.7;
}

.config-notice {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 14px;
  border: 1px solid rgba(243, 184, 95, 0.2);
  border-radius: 10px;
  color: var(--ink-soft);
  background: rgba(243, 184, 95, 0.045);
  font-size: 10px;
  line-height: 1.65;
}
.config-notice :deep(svg) {
  flex: 0 0 auto;
  color: var(--amber);
}

.config-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.config-search {
  display: flex;
  align-items: center;
  gap: 7px;
  width: min(360px, 100%);
  padding: 4px 4px 4px 11px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: rgba(12, 14, 19, 0.55);
}
.config-search:focus-within {
  border-color: rgba(243, 184, 95, 0.35);
}
.config-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 10.5px;
}
.config-search button {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 99px;
  color: #171208;
  background: var(--amber);
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}
.filter-selects {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.select-sm {
  width: auto;
  min-height: 33px;
  padding: 5px 30px 5px 10px;
  font-size: 10px;
  background-position: right 10px center;
}
.config-meta {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.05em;
}

.config-table {
  min-width: 860px;
}
.table-loading,
.table-empty {
  padding: 32px 16px !important;
  color: var(--muted) !important;
  text-align: center;
}
.config-key {
  display: grid;
  gap: 3px;
}
.config-type {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.12em;
}
.config-key code {
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 9.5px;
}
.config-name {
  color: var(--ink-soft);
  font-size: 10.5px;
}
.config-desc {
  overflow: hidden;
  max-width: 230px;
  color: var(--muted-weak);
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.config-value {
  display: block;
  overflow: hidden;
  max-width: 210px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.date-cell {
  color: var(--muted) !important;
  font-family: var(--font-mono);
  font-size: 8px;
}
.row-actions {
  display: flex;
  gap: 9px;
}
.row-action {
  color: var(--muted);
  background: transparent;
  font-size: 9.5px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.row-action:hover {
  color: var(--amber);
}
.row-action--danger:hover {
  color: var(--danger);
}

.edit-form {
  display: grid;
  gap: 13px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}
.textarea-mono {
  font-family: var(--font-mono);
  font-size: 10.5px;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .admin-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 13px;
  }
  .config-filters {
    align-items: stretch;
    flex-direction: column;
  }
  .config-search {
    width: 100%;
  }
}
@media (max-width: 560px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
