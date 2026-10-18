<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useToast } from '~/composables/useToast'
import { useUploader } from '~/composables/useUploader'
import { formatCount, formatDate, relativeTime } from '~/utils/format'

const auth = useAuth()
const { user, isAdmin, canUpload } = auth
const videoApi = useVideoApi()
const uploader = useUploader()
const toast = useToast()

const { data: overview } = await useAsyncData('account-overview', async () => {
  if (!user.value) return null
  const [profileResult, energyResult] = await Promise.allSettled([
    videoApi.getPublicUser(user.value.username),
    videoApi.getEnergyMe(),
  ])
  return {
    profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
    energy: energyResult.status === 'fulfilled' ? energyResult.value : null,
  }
})

const profile = computed(() => overview.value?.profile ?? null)
const energy = computed(() => overview.value?.energy ?? null)

const profileForm = reactive({
  nickname: user.value?.nickname || '',
  avatar: user.value?.avatar || '',
})
const savingProfile = ref(false)
const avatarUploading = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirm: '',
})
const savingPassword = ref(false)
const passwordError = ref('')
const loggingOut = ref(false)

const displayName = computed(() => user.value?.nickname || user.value?.username || '')

async function saveProfile() {
  if (savingProfile.value) return
  savingProfile.value = true
  try {
    await auth.updateProfile({
      nickname: profileForm.nickname.trim() || null,
      avatar: profileForm.avatar.trim() || null,
    })
    toast.success('个人资料已更新')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    savingProfile.value = false
  }
}

async function onAvatarFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarUploading.value = true
  try {
    const uploaded = await uploader.upload(file, 'IMAGE')
    if (!uploaded.publicUrl) {
      toast.error('当前存储未配置公开访问地址，无法把上传图片用作头像')
      return
    }
    profileForm.avatar = uploaded.publicUrl
    await auth.updateProfile({ avatar: uploaded.publicUrl })
    toast.success('头像已更新')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '头像上传失败')
  } finally {
    avatarUploading.value = false
  }
}

async function changePassword() {
  passwordError.value = ''
  if (passwordForm.newPassword.length < 6) {
    passwordError.value = '新密码至少需要 6 位'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirm) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }
  if (passwordForm.newPassword === passwordForm.currentPassword) {
    passwordError.value = '新密码不能与当前密码相同'
    return
  }

  savingPassword.value = true
  try {
    await auth.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    toast.success('密码已修改，请使用新密码重新登录')
    await navigateTo('/login')
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : '修改密码失败'
  } finally {
    savingPassword.value = false
  }
}

async function logout(allDevices = false) {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout(allDevices)
    toast.success(allDevices ? '已退出全部设备' : '已退出登录')
    await navigateTo('/')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '退出失败')
  } finally {
    loggingOut.value = false
  }
}

const transactionLabel: Record<string, string> = {
  ADMIN_ADJUST: '管理员调整',
  INITIAL_BONUS: '初始赠送',
  UPLOAD_COST: '上传消耗',
  REWARD: '奖励',
  PENALTY: '扣减',
  REFUND: '退回',
}

useSeoMeta({
  title: '个人中心',
  description: '管理你的光影账户、能量与上传权限。',
})
</script>

<template>
  <div v-if="user" class="page account-page">
    <div class="container">
      <header class="account-head">
        <div>
          <span class="eyebrow">YOUR SEAT · 个人中心</span>
          <h1 class="account-title">我的座位</h1>
          <p class="account-subtitle">管理资料、能量与放映权限。</p>
        </div>
        <span class="member-ticket">
          <AppIcon name="ticket" :size="14" />
          MEMBER NO. {{ String(user.id).padStart(5, '0') }}
        </span>
      </header>

      <div class="account-grid">
        <section class="profile-card panel">
          <div class="profile-banner">
            <span class="profile-banner-label">MEMBER PROFILE</span>
            <span class="profile-banner-year">{{ new Date().getFullYear() }}</span>
          </div>
          <div class="profile-body">
            <div class="profile-avatar-row">
              <button
                class="avatar-button"
                type="button"
                :disabled="avatarUploading"
                aria-label="更换头像"
                @click="avatarInput?.click()"
              >
                <UserAvatar :name="user.nickname" :username="user.username" :avatar="user.avatar" :size="86" ring />
                <span class="avatar-edit">
                  <AppIcon :name="avatarUploading ? 'refresh' : 'image'" :size="13" />
                </span>
              </button>
              <input ref="avatarInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="onAvatarFile">
              <div class="profile-identity">
                <div class="identity-line">
                  <h2>{{ displayName }}</h2>
                  <span class="badge" :class="isAdmin ? 'badge--amber' : 'badge--muted'">
                    {{ isAdmin ? 'ADMIN' : 'MEMBER' }}
                  </span>
                </div>
                <span class="profile-username">@{{ user.username }}</span>
                <span v-if="profile?.createdAt" class="profile-joined">入席于 {{ formatDate(profile.createdAt) }}</span>
              </div>
              <div class="profile-stats">
                <div>
                  <strong>{{ profile?.stats.publishedVideos ?? 0 }}</strong>
                  <span>公开影片</span>
                </div>
                <div>
                  <strong>{{ profile?.stats.comments ?? 0 }}</strong>
                  <span>留言</span>
                </div>
              </div>
            </div>

            <div class="profile-form">
              <div class="field">
                <label class="field-label" for="nickname">昵称</label>
                <input id="nickname" v-model="profileForm.nickname" class="input" maxlength="30" placeholder="设置一个显示名称">
              </div>
              <div class="field">
                <label class="field-label" for="avatarUrl">
                  头像地址
                  <span class="field-label__hint">或点击头像上传</span>
                </label>
                <input id="avatarUrl" v-model="profileForm.avatar" class="input" maxlength="1024" placeholder="https://…">
              </div>
              <button class="btn btn-primary" type="button" :disabled="savingProfile" @click="saveProfile">
                <span v-if="savingProfile" class="spinner" />
                <AppIcon v-else name="check" :size="15" />
                保存资料
              </button>
            </div>
          </div>
        </section>

        <aside class="account-side">
          <section class="permission-card panel" :class="canUpload ? 'is-granted' : ''">
            <div class="permission-head">
              <span class="side-icon"><AppIcon name="upload" :size="18" /></span>
              <span class="badge" :class="canUpload ? 'badge--green' : 'badge--muted'">
                {{ canUpload ? '已开通' : '未开通' }}
              </span>
            </div>
            <h2>上传权限</h2>
            <p v-if="canUpload">你可以向光影提交影片。用户提交默认进入审核队列，管理员审核后公开放映。</p>
            <p v-else>上传权限由管理员按账户开通。你可以先收藏、评论并积累自己的放映记录。</p>
            <NuxtLink v-if="canUpload" class="btn btn-primary btn-sm" to="/upload">
              <AppIcon name="circlePlus" :size="14" />
              提交新影片
            </NuxtLink>
            <NuxtLink v-else class="btn btn-ghost btn-sm" to="/videos">
              继续观看
            </NuxtLink>
          </section>

          <section class="energy-card panel">
            <div class="energy-head">
              <span class="side-label">ENERGY BALANCE</span>
              <AppIcon name="energy" :size="18" />
            </div>
            <div class="energy-value">
              <strong>{{ energy?.energy ?? user.energy }}</strong>
              <span>能量</span>
            </div>
            <p class="energy-note">可用于未来的上传消耗与创作者奖励。当前版本仅支持管理员调整。</p>
            <div v-if="energy?.recentTransactions.length" class="energy-list">
              <div v-for="transaction in energy.recentTransactions.slice(0, 4)" :key="transaction.id" class="energy-row">
                <span>{{ transactionLabel[transaction.type] || transaction.type }}</span>
                <span class="energy-amount" :class="{ 'is-negative': transaction.amount < 0 }">
                  {{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}
                </span>
                <time>{{ relativeTime(transaction.createdAt) }}</time>
              </div>
            </div>
            <p v-else class="energy-empty">还没有能量流水。</p>
          </section>
        </aside>

        <section class="security-card panel">
          <header class="panel-head">
            <div>
              <span class="section-kicker">SECURITY</span>
              <h2 class="panel-title">修改密码</h2>
            </div>
            <AppIcon name="lock" :size="19" class="security-icon" />
          </header>
          <div class="panel-body">
            <form class="security-form" @submit.prevent="changePassword">
              <div class="field">
                <label class="field-label" for="current-password">当前密码</label>
                <input id="current-password" v-model="passwordForm.currentPassword" class="input" type="password" autocomplete="current-password" required>
              </div>
              <div class="field">
                <label class="field-label" for="new-password">新密码</label>
                <input id="new-password" v-model="passwordForm.newPassword" class="input" type="password" autocomplete="new-password" required>
              </div>
              <div class="field">
                <label class="field-label" for="confirm-password">确认新密码</label>
                <input id="confirm-password" v-model="passwordForm.confirm" class="input" type="password" autocomplete="new-password" required>
              </div>
              <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
              <div class="security-actions">
                <button class="btn btn-ghost" type="submit" :disabled="savingPassword">
                  <span v-if="savingPassword" class="spinner" />
                  <AppIcon v-else name="shield" :size="15" />
                  更新密码
                </button>
                <span>修改成功后会退出全部设备。</span>
              </div>
            </form>
          </div>
        </section>

        <section class="session-card panel">
          <header class="panel-head">
            <div>
              <span class="section-kicker">SESSION</span>
              <h2 class="panel-title">登录与设备</h2>
            </div>
          </header>
          <div class="panel-body session-body">
            <p>退出当前设备只会结束这一次会话；退出全部设备会吊销所有已登录的浏览器。</p>
            <div class="session-actions">
              <button class="btn btn-ghost btn-sm" type="button" :disabled="loggingOut" @click="logout(false)">
                <AppIcon name="logout" :size="14" />
                退出当前设备
              </button>
              <button class="btn btn-danger btn-sm" type="button" :disabled="loggingOut" @click="logout(true)">
                退出全部设备
              </button>
            </div>
          </div>
        </section>

        <NuxtLink v-if="isAdmin" class="admin-invite" to="/admin">
          <span class="side-icon"><AppIcon name="shield" :size="18" /></span>
          <span>
            <strong>管理控制室</strong>
            <small>用户权限、影片审核与站点配置</small>
          </span>
          <AppIcon name="arrowRight" :size="16" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-page {
  padding-top: clamp(30px, 4vw, 54px);
}

.account-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--line);
}
.account-head > div {
  display: grid;
  gap: 9px;
}
.account-title {
  font-family: var(--font-display);
  font-size: clamp(42px, 5.5vw, 68px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
}
.account-subtitle {
  color: var(--muted);
  font-size: 12px;
}
.member-ticket {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.account-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.8fr);
  gap: 18px;
  margin-top: 28px;
  align-items: start;
}

.profile-card {
  overflow: hidden;
}
.profile-banner {
  display: flex;
  justify-content: space-between;
  padding: 15px 22px;
  border-bottom: 1px solid var(--line);
  background:
    radial-gradient(circle at 82% 0%, rgba(243, 184, 95, 0.18), transparent 52%),
    linear-gradient(120deg, rgba(243, 184, 95, 0.06), transparent);
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
}
.profile-banner-year {
  color: var(--amber);
}
.profile-body {
  padding: 24px 24px 26px;
}
.profile-avatar-row {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.avatar-button {
  position: relative;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.avatar-edit {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 2px solid var(--surface);
  border-radius: 50%;
  color: #171208;
  background: var(--amber);
}
.profile-identity {
  display: grid;
  flex: 1;
  gap: 4px;
}
.identity-line {
  display: flex;
  align-items: center;
  gap: 9px;
}
.identity-line h2 {
  font-family: var(--font-display);
  font-size: 29px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.profile-username {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9.5px;
}
.profile-joined {
  color: var(--muted-weak);
  font-size: 9.5px;
}
.profile-stats {
  display: flex;
  gap: 24px;
}
.profile-stats div {
  display: grid;
  gap: 2px;
  justify-items: end;
}
.profile-stats strong {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  line-height: 1;
}
.profile-stats span {
  color: var(--muted-weak);
  font-size: 8.5px;
}
.profile-form {
  display: grid;
  gap: 14px;
  margin-top: 24px;
  padding-top: 22px;
  border-top: 1px solid var(--line);
}
.profile-form .btn {
  justify-self: start;
}

.account-side {
  display: grid;
  gap: 13px;
}

.permission-card,
.energy-card {
  padding: 21px;
}
.permission-head,
.energy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}
.side-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--amber);
  background: var(--amber-soft);
}
.permission-card h2 {
  margin-bottom: 5px;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
}
.permission-card p {
  margin-bottom: 15px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}
.permission-card.is-granted {
  border-color: rgba(146, 214, 164, 0.16);
  background:
    linear-gradient(150deg, rgba(146, 214, 164, 0.05), transparent 45%),
    rgba(15, 18, 24, 0.55);
}
.permission-card.is-granted .side-icon {
  color: var(--success);
  background: rgba(146, 214, 164, 0.1);
}

.side-label {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}
.energy-head :deep(svg) {
  color: var(--amber);
}
.energy-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 9px;
}
.energy-value strong {
  color: var(--amber-bright);
  font-family: var(--font-display);
  font-size: 52px;
  font-weight: 400;
  line-height: 1;
}
.energy-value span {
  color: var(--muted);
  font-size: 10px;
}
.energy-note {
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.65;
}
.energy-list {
  display: grid;
  gap: 0;
  margin-top: 14px;
  border-top: 1px solid var(--line);
}
.energy-row {
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 9.5px;
}
.energy-row time {
  margin-left: auto;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
}
.energy-amount {
  color: var(--success);
  font-family: var(--font-mono);
  font-size: 9px;
}
.energy-amount.is-negative {
  color: var(--danger);
}
.energy-empty {
  margin-top: 12px;
  color: var(--muted-weak);
  font-size: 10px;
}

.security-card {
  grid-column: 1 / 2;
}
.security-icon {
  color: var(--amber);
}
.security-form {
  display: grid;
  gap: 14px;
}
.security-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.security-actions span {
  color: var(--muted-weak);
  font-size: 9.5px;
}

.session-card {
  grid-column: 2 / 3;
  align-self: stretch;
}
.session-body {
  display: grid;
  gap: 17px;
}
.session-body p {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}
.session-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-invite {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 17px 20px;
  border: 1px solid rgba(243, 184, 95, 0.16);
  border-radius: var(--radius);
  background: rgba(243, 184, 95, 0.045);
}
.admin-invite span:nth-child(2) {
  display: grid;
  flex: 1;
  gap: 2px;
}
.admin-invite strong {
  font-size: 12px;
}
.admin-invite small {
  color: var(--muted);
  font-size: 10px;
}
.admin-invite > :deep(svg) {
  color: var(--amber);
}

@media (max-width: 920px) {
  .account-grid {
    grid-template-columns: 1fr;
  }
  .security-card,
  .session-card {
    grid-column: auto;
  }
  .account-side {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .account-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
  .account-side {
    grid-template-columns: 1fr;
  }
  .profile-stats {
    width: 100%;
    justify-content: flex-start;
    gap: 30px;
  }
  .profile-stats div {
    justify-items: start;
  }
}
</style>
