<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const toast = useToast()
const siteSettings = useSiteSettings()
const { user, canUpload, isAdmin } = auth

const scrolled = ref(false)
const mobileOpen = ref(false)
const userMenuOpen = ref(false)
const keyword = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const userMenuRef = ref<HTMLElement | null>(null)

const displayName = computed(() => user.value?.nickname || user.value?.username || '')

function syncScroll() {
  scrolled.value = window.scrollY > 18
}

function onDocumentClick(event: MouseEvent) {
  if (!userMenuOpen.value) return
  const target = event.target as Node
  if (!userMenuRef.value?.contains(target)) userMenuOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== '/') return
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  event.preventDefault()
  searchInput.value?.focus()
}

function submitSearch() {
  const value = keyword.value.trim()
  mobileOpen.value = false
  router.push({ path: '/videos', query: value ? { keyword: value } : {} })
}

async function logout(allDevices = false) {
  try {
    await auth.logout(allDevices)
    userMenuOpen.value = false
    mobileOpen.value = false
    toast.success(allDevices ? '已退出全部设备' : '已退出登录')
    await navigateTo('/')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '退出失败，请稍后重试')
  }
}

watch(() => route.fullPath, () => {
  mobileOpen.value = false
  userMenuOpen.value = false
})

onMounted(() => {
  syncScroll()
  window.addEventListener('scroll', syncScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncScroll)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled, 'is-open': mobileOpen }">
    <div class="container header-inner">
      <NuxtLink to="/" class="brand-link" :aria-label="`${siteSettings.name}首页`">
        <AppLogo />
      </NuxtLink>

      <nav class="main-nav" aria-label="主导航">
        <NuxtLink to="/" exact-active-class="is-active">发现</NuxtLink>
        <NuxtLink to="/videos" active-class="is-active">片库</NuxtLink>
        <NuxtLink to="/rankings" active-class="is-active">热度</NuxtLink>
        <span class="nav-line" aria-hidden="true" />
        <NuxtLink v-if="user" to="/favorites" active-class="is-active">收藏</NuxtLink>
      </nav>

      <div class="header-actions">
        <form class="header-search" role="search" @submit.prevent="submitSearch">
          <AppIcon name="search" :size="15" />
          <input
            ref="searchInput"
            v-model="keyword"
            type="search"
            name="q"
            placeholder="搜索片名、标签"
            aria-label="搜索视频"
            autocomplete="off"
          >
          <span class="search-key" aria-hidden="true">/</span>
        </form>

        <NuxtLink v-if="canUpload" class="upload-entry" to="/upload">
          <AppIcon name="upload" :size="14" />
          <span>上传</span>
        </NuxtLink>

        <div v-if="user" ref="userMenuRef" class="user-wrap">
          <button
            class="user-trigger"
            type="button"
            :aria-expanded="userMenuOpen"
            aria-haspopup="menu"
            @click.stop="userMenuOpen = !userMenuOpen"
          >
            <UserAvatar :name="user.nickname" :username="user.username" :avatar="user.avatar" :size="33" ring />
            <span class="user-name">{{ displayName }}</span>
            <AppIcon name="chevronDown" :size="12" class="user-chevron" />
          </button>

          <Transition name="dropdown">
            <div v-if="userMenuOpen" class="user-menu" role="menu">
              <div class="user-menu-head">
                <span class="menu-eyebrow">SIGNED IN</span>
                <strong>{{ displayName }}</strong>
                <span class="menu-username">@{{ user.username }}</span>
                <span class="energy-pill">
                  <AppIcon name="energy" :size="12" />
                  {{ user.energy }} 能量
                </span>
              </div>

              <div class="menu-links">
                <NuxtLink to="/account" role="menuitem">
                  <AppIcon name="user" :size="15" />
                  个人中心
                </NuxtLink>
                <NuxtLink to="/my/videos" role="menuitem">
                  <AppIcon name="film" :size="15" />
                  我的影片
                </NuxtLink>
                <NuxtLink to="/favorites" role="menuitem">
                  <AppIcon name="bookmark" :size="15" />
                  我的收藏
                </NuxtLink>
                <NuxtLink to="/history" role="menuitem">
                  <AppIcon name="clock" :size="15" />
                  观看历史
                </NuxtLink>
                <NuxtLink v-if="isAdmin" to="/admin" role="menuitem" class="admin-entry">
                  <AppIcon name="shield" :size="15" />
                  管理后台
                </NuxtLink>
              </div>

              <div class="menu-foot">
                <button type="button" role="menuitem" @click="logout(false)">
                  <AppIcon name="logout" :size="14" />
                  退出登录
                </button>
                <button type="button" role="menuitem" @click="logout(true)">
                  退出全部设备
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <template v-else>
          <NuxtLink class="login-link" to="/login">登录</NuxtLink>
          <NuxtLink class="btn btn-primary btn-sm join-link" to="/register">加入光影</NuxtLink>
        </template>

        <button
          class="mobile-toggle"
          type="button"
          :aria-expanded="mobileOpen"
          aria-label="打开菜单"
          @click="mobileOpen = !mobileOpen"
        >
          <AppIcon :name="mobileOpen ? 'close' : 'menu'" :size="19" />
        </button>
      </div>
    </div>

    <Transition name="mobile-menu">
      <div v-if="mobileOpen" class="mobile-panel">
        <div class="container mobile-inner">
          <form class="mobile-search" role="search" @submit.prevent="submitSearch">
            <AppIcon name="search" :size="17" />
            <input v-model="keyword" type="search" placeholder="搜索片名、标签" aria-label="搜索视频">
          </form>

          <nav class="mobile-nav" aria-label="移动端导航">
            <NuxtLink to="/" @click="mobileOpen = false">
              <span>发现</span><AppIcon name="arrowRight" :size="15" />
            </NuxtLink>
            <NuxtLink to="/videos" @click="mobileOpen = false">
              <span>片库</span><AppIcon name="arrowRight" :size="15" />
            </NuxtLink>
            <NuxtLink to="/rankings" @click="mobileOpen = false">
              <span>热度榜</span><AppIcon name="arrowRight" :size="15" />
            </NuxtLink>
          </nav>

          <div class="mobile-account">
            <template v-if="user">
              <NuxtLink class="mobile-profile" to="/account" @click="mobileOpen = false">
                <UserAvatar :name="user.nickname" :username="user.username" :avatar="user.avatar" :size="44" ring />
                <span>
                  <strong>{{ displayName }}</strong>
                  <small>{{ user.energy }} 能量 · {{ user.canUpload ? '可上传' : '观看中' }}</small>
                </span>
                <AppIcon name="arrowRight" :size="16" />
              </NuxtLink>
              <div class="mobile-links">
                <NuxtLink to="/my/videos" @click="mobileOpen = false">我的影片</NuxtLink>
                <NuxtLink to="/favorites" @click="mobileOpen = false">收藏</NuxtLink>
                <NuxtLink to="/history" @click="mobileOpen = false">历史</NuxtLink>
                <NuxtLink v-if="isAdmin" to="/admin" @click="mobileOpen = false">后台</NuxtLink>
              </div>
              <button class="btn btn-ghost btn-block" type="button" @click="logout(false)">
                <AppIcon name="logout" :size="15" />
                退出登录
              </button>
            </template>
            <template v-else>
              <div class="mobile-auth">
                <NuxtLink class="btn btn-ghost btn-block" to="/login" @click="mobileOpen = false">登录</NuxtLink>
                <NuxtLink class="btn btn-primary btn-block" to="/register" @click="mobileOpen = false">创建账户</NuxtLink>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 900;
  border-bottom: 1px solid transparent;
  transition: background 260ms ease, border-color 260ms ease, backdrop-filter 260ms ease;
}
.site-header.is-scrolled {
  border-color: var(--line);
  background: rgba(8, 9, 12, 0.78);
  backdrop-filter: blur(22px);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  min-height: var(--header-height);
}

.brand-link {
  flex: 0 0 auto;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 27px;
  margin-right: auto;
}
.main-nav a {
  position: relative;
  padding: 6px 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: color 180ms ease;
}
.main-nav a::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: var(--amber);
  content: "";
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 220ms var(--ease-out);
}
.main-nav a:hover,
.main-nav a.is-active,
.main-nav a.router-link-exact-active {
  color: var(--ink);
}
.main-nav a:hover::after,
.main-nav a.is-active::after,
.main-nav a.router-link-exact-active::after {
  transform: scaleX(1);
  transform-origin: left;
}
.nav-line {
  width: 1px;
  height: 14px;
  background: var(--line-strong);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 210px;
  height: 38px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  background: rgba(12, 14, 19, 0.52);
  transition: width 260ms var(--ease-out), border-color 180ms ease, background 180ms ease;
}
.header-search:focus-within {
  width: 260px;
  border-color: rgba(243, 184, 95, 0.36);
  background: rgba(12, 14, 19, 0.86);
}
.header-search input {
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--ink);
  background: transparent;
  font-size: 11.5px;
}
.header-search input::placeholder {
  color: var(--muted-weak);
}
.header-search input::-webkit-search-cancel-button {
  display: none;
}
.search-key {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 9px;
}

.upload-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(243, 184, 95, 0.28);
  border-radius: 99px;
  color: var(--amber-bright);
  background: rgba(243, 184, 95, 0.08);
  font-size: 11px;
  font-weight: 650;
  transition: 170ms ease;
}
.upload-entry:hover {
  border-color: rgba(243, 184, 95, 0.55);
  background: rgba(243, 184, 95, 0.14);
}

.user-wrap {
  position: relative;
}
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 3px 3px 4px;
  border-radius: 99px;
  color: var(--ink-soft);
  background: transparent;
  cursor: pointer;
  transition: background 170ms ease;
}
.user-trigger:hover {
  background: rgba(243, 239, 228, 0.05);
}
.user-name {
  max-width: 88px;
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-chevron {
  margin-right: 5px;
  color: var(--muted);
}

.user-menu {
  position: absolute;
  top: calc(100% + 13px);
  right: 0;
  width: 248px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  background: rgba(15, 18, 24, 0.97);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(24px);
}
.user-menu-head {
  display: grid;
  gap: 5px;
  padding: 18px 18px 15px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(140deg, rgba(243, 184, 95, 0.08), transparent 62%);
}
.menu-eyebrow {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.18em;
}
.user-menu-head strong {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
}
.menu-username {
  color: var(--muted);
  font-size: 10px;
}
.energy-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  margin-top: 4px;
  padding: 3px 8px;
  border: 1px solid rgba(243, 184, 95, 0.22);
  border-radius: 99px;
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.menu-links {
  display: grid;
  padding: 8px;
}
.menu-links a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-radius: 8px;
  color: var(--ink-soft);
  font-size: 11.5px;
  transition: 150ms ease;
}
.menu-links a:hover {
  color: var(--ink);
  background: rgba(243, 239, 228, 0.06);
}
.menu-links a :deep(svg) {
  color: var(--muted);
}
.admin-entry {
  margin-top: 4px;
  border-top: 1px solid var(--line);
  border-radius: 0 !important;
  color: var(--amber) !important;
}

.menu-foot {
  display: grid;
  gap: 2px;
  padding: 8px;
  border-top: 1px solid var(--line);
}
.menu-foot button {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 11px;
  border-radius: 7px;
  color: var(--muted);
  background: transparent;
  font-size: 10.5px;
  text-align: left;
  cursor: pointer;
}
.menu-foot button:hover {
  color: var(--ink);
  background: rgba(243, 239, 228, 0.05);
}

.login-link {
  padding: 0 3px;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 600;
  transition: color 160ms ease;
}
.login-link:hover {
  color: var(--amber-bright);
}

.mobile-toggle {
  display: none;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--ink-soft);
  background: transparent;
  cursor: pointer;
}

.mobile-panel {
  display: none;
  border-top: 1px solid var(--line);
  background: rgba(8, 9, 12, 0.97);
  backdrop-filter: blur(24px);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 160ms ease, transform 200ms var(--ease-out);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-7px) scale(0.98);
}

@media (max-width: 1120px) {
  .header-search {
    width: 170px;
  }
  .header-search:focus-within {
    width: 220px;
  }
  .main-nav {
    gap: 20px;
  }
}

@media (max-width: 980px) {
  .main-nav,
  .header-search,
  .upload-entry span,
  .user-name,
  .login-link,
  .join-link {
    display: none;
  }
  .upload-entry {
    width: 38px;
    padding: 0;
    justify-content: center;
  }
  .mobile-toggle {
    display: grid;
  }
  .mobile-panel {
    display: block;
  }
}

@media (max-width: 560px) {
  .header-inner {
    gap: 12px;
  }
  .user-chevron {
    display: none;
  }
  .user-trigger {
    gap: 0;
  }
}

.mobile-inner {
  display: grid;
  gap: 18px;
  padding-top: 18px;
  padding-bottom: 24px;
}
.mobile-search {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 15px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  color: var(--muted);
  background: rgba(17, 20, 27, 0.7);
}
.mobile-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 13px;
}
.mobile-nav {
  display: grid;
  border-top: 1px solid var(--line);
}
.mobile-nav a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 2px;
  border-bottom: 1px solid var(--line);
  color: var(--ink-soft);
  font-family: var(--font-display);
  font-size: 22px;
}
.mobile-nav a :deep(svg) {
  color: var(--muted);
}
.mobile-account {
  display: grid;
  gap: 14px;
}
.mobile-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(17, 20, 27, 0.56);
}
.mobile-profile span {
  display: grid;
  flex: 1;
  gap: 3px;
}
.mobile-profile strong {
  font-size: 13px;
}
.mobile-profile small {
  color: var(--muted);
  font-size: 10px;
}
.mobile-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mobile-links a {
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  font-size: 10.5px;
}
.mobile-auth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 180ms ease, transform 240ms var(--ease-out);
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
