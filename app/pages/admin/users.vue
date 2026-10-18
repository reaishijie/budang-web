<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { AdminUser, UserRole, UserStatus } from '~/types'
import { formatDate } from '~/utils/format'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })

const auth = useAuth()
const { user: currentUser } = auth
const videoApi = useVideoApi()
const toast = useToast()

const statusOptions: Array<{ value: UserStatus | ''; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'ACTIVE', label: '正常' },
  { value: 'PENDING', label: '待激活' },
  { value: 'SUSPENDED', label: '已冻结' },
  { value: 'DISABLED', label: '已停用' },
]
const roleOptions: Array<{ value: UserRole | ''; label: string }> = [
  { value: '', label: '全部角色' },
  { value: 'USER', label: '用户' },
  { value: 'ADMIN', label: '管理员' },
]

const keywordInput = ref('')
const keyword = ref('')
const status = ref<UserStatus | ''>('')
const role = ref<UserRole | ''>('')
const canUpload = ref('')
const page = ref(1)
const actingUsername = ref<string | null>(null)

const { data, pending, error, refresh } = await useAsyncData(
  () => `admin-users-${keyword.value}-${status.value}-${role.value}-${canUpload.value}-${page.value}`,
  () => videoApi.listUsers({
    page: page.value,
    pageSize: 15,
    keyword: keyword.value || undefined,
    status: status.value,
    role: role.value,
    canUpload: canUpload.value,
  }),
  {
    watch: [keyword, status, role, canUpload, page],
    default: () => ({ items: [] as AdminUser[], total: 0, page: 1, pageSize: 15, totalPages: 0 }),
  },
)

const users = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const uploadCount = computed(() => users.value.filter(user => user.canUpload).length)

function search() {
  keyword.value = keywordInput.value.trim()
  page.value = 1
}

function resetFilters() {
  keywordInput.value = ''
  keyword.value = ''
  status.value = ''
  role.value = ''
  canUpload.value = ''
  page.value = 1
}

function isSelf(user: AdminUser) {
  return user.id === currentUser.value?.id
}

async function toggleUpload(user: AdminUser) {
  if (actingUsername.value) return
  actingUsername.value = user.username
  try {
    await videoApi.setUploadPermission(user.username, !user.canUpload)
    toast.success(user.canUpload ? `已关闭 @${user.username} 的上传权限` : `已开通 @${user.username} 的上传权限`)
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    actingUsername.value = null
  }
}

const editOpen = ref(false)
const editingUser = ref<AdminUser | null>(null)
const savingUser = ref(false)
const editForm = reactive({
  nickname: '',
  email: '',
  phone: '',
  status: 'ACTIVE' as UserStatus,
  role: 'USER' as UserRole,
  canUpload: false,
})

function openEdit(user: AdminUser) {
  editingUser.value = user
  editForm.nickname = user.nickname || ''
  editForm.email = user.email || ''
  editForm.phone = user.phone || ''
  editForm.status = user.status || 'ACTIVE'
  editForm.role = user.role
  editForm.canUpload = user.canUpload
  editOpen.value = true
}

async function saveUser() {
  if (!editingUser.value || savingUser.value) return
  savingUser.value = true
  try {
    await videoApi.updateUser(editingUser.value.username, {
      nickname: editForm.nickname.trim() || null,
      email: editForm.email.trim() || null,
      phone: editForm.phone.trim() || null,
      status: editForm.status,
      role: editForm.role,
      canUpload: editForm.canUpload,
    })
    toast.success('用户资料已更新')
    editOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    savingUser.value = false
  }
}

const energyOpen = ref(false)
const energyUser = ref<AdminUser | null>(null)
const energyAmount = ref(100)
const energyNote = ref('')
const adjustingEnergy = ref(false)

function openEnergy(user: AdminUser) {
  energyUser.value = user
  energyAmount.value = 100
  energyNote.value = ''
  energyOpen.value = true
}

async function submitEnergy() {
  if (!energyUser.value || adjustingEnergy.value) return
  const amount = Math.round(Number(energyAmount.value))
  if (!Number.isFinite(amount) || amount === 0) {
    toast.error('能量调整值必须是非零整数')
    return
  }
  adjustingEnergy.value = true
  try {
    const result = await videoApi.adjustEnergy({
      username: energyUser.value.username,
      amount,
      note: energyNote.value.trim() || undefined,
    })
    toast.success(`能量已更新，当前余额 ${result.user.energy}`)
    energyOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '能量调整失败')
  } finally {
    adjustingEnergy.value = false
  }
}

async function remove(user: AdminUser) {
  if (!import.meta.client || actingUsername.value) return
  if (!window.confirm(`确定删除用户 @${user.username} 吗？账户会被停用并吊销全部会话。`)) return
  actingUsername.value = user.username
  try {
    await videoApi.deleteUser(user.username)
    toast.success('用户已删除')
    await refresh()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败')
  } finally {
    actingUsername.value = null
  }
}

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: '正常',
  PENDING: '待激活',
  SUSPENDED: '已冻结',
  DISABLED: '已停用',
}
const statusTone: Record<UserStatus, string> = {
  ACTIVE: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
  DISABLED: 'muted',
}

useSeoMeta({ title: '用户与权限', description: '管理补档用户、角色、状态与上传权限。' })
</script>

<template>
  <div class="admin-page">
    <header class="admin-head">
      <div>
        <span class="eyebrow">AUDIENCE & ACCESS · 用户与权限</span>
        <h1>观众席</h1>
        <p>开通上传权限、调整账户状态，以及管理观众的能量。</p>
      </div>
      <div class="head-stats">
        <span><strong>{{ total }}</strong> 位用户</span>
        <span><strong>{{ uploadCount }}</strong> 位本页可上传</span>
      </div>
    </header>

    <div class="user-filters">
      <form class="user-search" role="search" @submit.prevent="search">
        <AppIcon name="search" :size="14" />
        <input v-model="keywordInput" type="search" placeholder="搜索用户名、昵称、邮箱或手机号" aria-label="搜索用户">
        <button type="submit">搜索</button>
      </form>
      <div class="filter-selects">
        <select v-model="status" class="select select-sm" aria-label="筛选状态">
          <option v-for="option in statusOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="role" class="select select-sm" aria-label="筛选角色">
          <option v-for="option in roleOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="canUpload" class="select select-sm" aria-label="筛选上传权限">
          <option value="">全部上传权限</option>
          <option value="true">可上传</option>
          <option value="false">不可上传</option>
        </select>
        <button class="btn btn-ghost btn-sm" type="button" @click="resetFilters">重置</button>
      </div>
    </div>

    <div v-if="error" class="form-error">{{ error.message }}</div>

    <div class="table-shell">
      <table class="data-table user-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>状态</th>
            <th>上传权限</th>
            <th>能量</th>
            <th>加入时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="7" class="table-loading">正在读取观众名单…</td>
          </tr>
          <template v-else>
          <tr v-for="user in users" :key="user.id">
            <td>
              <div class="user-cell">
                <UserAvatar :name="user.nickname" :username="user.username" :avatar="user.avatar" :size="34" />
                <div class="user-cell-copy">
                  <span class="user-cell-name">
                    {{ user.nickname || user.username }}
                    <span v-if="isSelf(user)" class="self-tag">你</span>
                  </span>
                  <span class="user-cell-handle">@{{ user.username }} <template v-if="user.email"> · {{ user.email }}</template></span>
                </div>
              </div>
            </td>
            <td>
              <span class="badge" :class="user.role === 'ADMIN' ? 'badge--amber' : 'badge--muted'">
                {{ user.role }}
              </span>
            </td>
            <td>
              <span class="badge" :class="`badge--${statusTone[user.status || 'ACTIVE']}`">
                {{ statusLabels[user.status || 'ACTIVE'] }}
              </span>
            </td>
            <td>
              <button
                class="permission-toggle"
                :class="{ 'is-on': user.canUpload }"
                type="button"
                :disabled="actingUsername === user.username"
                :aria-pressed="user.canUpload"
                :aria-label="user.canUpload ? '关闭上传权限' : '开通上传权限'"
                @click="toggleUpload(user)"
              >
                <span class="toggle-track"><i /></span>
                {{ user.canUpload ? '已开通' : '未开通' }}
              </button>
            </td>
            <td>
              <span class="energy-cell"><AppIcon name="energy" :size="12" />{{ user.energy }}</span>
            </td>
            <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
            <td>
              <div class="row-actions">
                <button class="row-action" type="button" @click="openEdit(user)">编辑</button>
                <button class="row-action" type="button" @click="openEnergy(user)">能量</button>
                <button v-if="!isSelf(user)" class="row-action row-action--danger" type="button" :disabled="actingUsername === user.username" @click="remove(user)">删除</button>
                <span v-else class="row-action row-action--disabled">当前账号</span>
              </div>
            </td>
          </tr>
          <tr v-if="!users.length">
            <td colspan="7" class="table-empty">没有符合条件的用户。</td>
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
      title="编辑用户"
      description="ACCOUNT DETAILS"
      width="580px"
      @close="editOpen = false"
    >
      <form class="edit-grid" @submit.prevent="saveUser">
        <div class="field">
          <label class="field-label">用户名</label>
          <input class="input" :value="editingUser?.username" disabled>
        </div>
        <div class="field">
          <label class="field-label" for="edit-nickname">昵称</label>
          <input id="edit-nickname" v-model="editForm.nickname" class="input" maxlength="30">
        </div>
        <div class="field">
          <label class="field-label" for="edit-email">邮箱</label>
          <input id="edit-email" v-model="editForm.email" class="input" type="email" placeholder="留空则清空">
        </div>
        <div class="field">
          <label class="field-label" for="edit-phone">手机号</label>
          <input id="edit-phone" v-model="editForm.phone" class="input" type="tel" placeholder="留空则清空">
        </div>
        <div class="field">
          <label class="field-label" for="edit-status">状态</label>
          <select id="edit-status" v-model="editForm.status" class="select">
            <option v-for="option in statusOptions.filter(item => item.value)" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="edit-role">角色</label>
          <select id="edit-role" v-model="editForm.role" class="select" :disabled="editingUser?.id === currentUser?.id">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <label class="check-field">
          <input v-model="editForm.canUpload" type="checkbox">
          <span>允许该用户上传影片</span>
        </label>
        <p v-if="editingUser?.id === currentUser?.id" class="field-hint">不能修改当前登录管理员自己的角色或停用状态。</p>
      </form>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="editOpen = false">取消</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="savingUser" @click="saveUser">
          <span v-if="savingUser" class="spinner" />
          <AppIcon v-else name="check" :size="13" />
          保存用户
        </button>
      </template>
    </ModalDialog>

    <ModalDialog
      :open="energyOpen"
      title="调整能量"
      description="ENERGY LEDGER"
      width="480px"
      @close="energyOpen = false"
    >
      <div class="energy-modal">
        <div class="energy-user">
          <UserAvatar :name="energyUser?.nickname" :username="energyUser?.username" :avatar="energyUser?.avatar" :size="42" />
          <div>
            <strong>{{ energyUser?.nickname || energyUser?.username }}</strong>
            <span>当前余额 {{ energyUser?.energy ?? 0 }} 能量</span>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="energy-amount">调整值</label>
          <input id="energy-amount" v-model.number="energyAmount" class="input" type="number" step="1">
          <span class="field-hint">正数增加，负数扣减；余额不能小于 0。</span>
        </div>
        <div class="field">
          <label class="field-label" for="energy-note">备注</label>
          <input id="energy-note" v-model="energyNote" class="input" maxlength="255" placeholder="例如：活动奖励">
        </div>
        <div class="quick-amounts">
          <button v-for="amount in [50, 100, 500, -100]" :key="amount" type="button" class="chip" :class="{ 'is-active': energyAmount === amount }" @click="energyAmount = amount">
            {{ amount > 0 ? '+' : '' }}{{ amount }}
          </button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-ghost btn-sm" type="button" @click="energyOpen = false">取消</button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="adjustingEnergy" @click="submitEnergy">
          <span v-if="adjustingEnergy" class="spinner" />
          <AppIcon v-else name="energy" :size="13" />
          确认调整
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
  color: var(--muted);
  font-size: 11.5px;
}
.head-stats {
  display: flex;
  flex: 0 0 auto;
  gap: 16px;
  color: var(--muted);
  font-size: 9.5px;
}
.head-stats span {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.head-stats strong {
  color: var(--amber);
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 500;
}

.user-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.user-search {
  display: flex;
  align-items: center;
  gap: 7px;
  width: min(380px, 100%);
  padding: 4px 4px 4px 11px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: rgba(12, 14, 19, 0.55);
}
.user-search:focus-within {
  border-color: rgba(243, 184, 95, 0.35);
}
.user-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 10.5px;
}
.user-search button {
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

.user-table {
  min-width: 880px;
}
.table-loading,
.table-empty {
  padding: 32px 16px !important;
  color: var(--muted) !important;
  text-align: center;
}
.user-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}
.user-cell-copy {
  display: grid;
  gap: 1px;
}
.user-cell-name {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 600;
}
.user-cell-handle {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
}
.self-tag {
  padding: 1px 5px;
  border-radius: 99px;
  color: var(--amber);
  background: var(--amber-soft);
  font-family: var(--font-mono);
  font-size: 7px;
}

.permission-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: transparent;
  font-size: 8.5px;
  cursor: pointer;
  transition: 160ms ease;
}
.permission-toggle:hover {
  border-color: var(--line-strong);
  color: var(--ink-soft);
}
.permission-toggle.is-on {
  color: var(--success);
  border-color: rgba(146, 214, 164, 0.24);
  background: rgba(146, 214, 164, 0.07);
}
.toggle-track {
  position: relative;
  width: 24px;
  height: 13px;
  border-radius: 99px;
  background: var(--surface-3);
  transition: background 160ms ease;
}
.toggle-track i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--muted);
  transition: transform 170ms var(--ease-out), background 170ms ease;
}
.permission-toggle.is-on .toggle-track {
  background: rgba(146, 214, 164, 0.32);
}
.permission-toggle.is-on .toggle-track i {
  background: var(--success);
  transform: translateX(11px);
}

.energy-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 10px;
}
.date-cell {
  color: var(--muted) !important;
  font-family: var(--font-mono);
  font-size: 8.5px;
}
.row-actions {
  display: flex;
  flex-wrap: wrap;
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
.row-action--disabled {
  color: var(--muted-weak);
  text-decoration: none;
  cursor: default;
}

.edit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}
.check-field {
  display: flex;
  align-items: center;
  gap: 8px;
  grid-column: 1 / -1;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--ink-soft);
  font-size: 11px;
  cursor: pointer;
}
.check-field input {
  accent-color: var(--amber);
}

.energy-modal {
  display: grid;
  gap: 14px;
}
.energy-user {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(6, 7, 10, 0.35);
}
.energy-user > div {
  display: grid;
  gap: 2px;
}
.energy-user strong {
  font-size: 12px;
}
.energy-user span {
  color: var(--muted);
  font-size: 9.5px;
}
.quick-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.quick-amounts .chip {
  min-height: 29px;
  padding: 0 11px;
  font-size: 10px;
}

@media (max-width: 980px) {
  .admin-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
  .user-filters {
    align-items: stretch;
    flex-direction: column;
  }
  .user-search {
    width: 100%;
  }
}
@media (max-width: 580px) {
  .edit-grid {
    grid-template-columns: 1fr;
  }
  .check-field {
    grid-column: auto;
  }
  .head-stats {
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
