<script setup lang="ts">
const route = useRoute()
const auth = useAuth()

const navItems = [
  { to: '/admin', label: '概览', icon: 'grid', exact: true },
  { to: '/admin/review', label: '影片审核', icon: 'film' },
  { to: '/admin/users', label: '用户与权限', icon: 'users' },
  { to: '/admin/taxonomy', label: '分类与标签', icon: 'layers' },
  { to: '/admin/configs', label: '站点配置', icon: 'sliders' },
]

function isActive(item: { to: string; exact?: boolean }) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}
</script>

<template>
  <a class="skip-link" href="#admin-content">跳到管理内容</a>
  <div class="admin-shell">
    <AppHeader />
    <div class="container admin-layout">
      <aside class="admin-side">
        <div class="admin-side-head">
          <span class="admin-eyebrow">ADMIN STUDIO</span>
          <strong>放映控制室</strong>
          <small>管理操作由后端 ADMIN 角色再次鉴权</small>
        </div>

        <nav class="admin-nav" aria-label="管理后台导航">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="{ 'is-active': isActive(item) }"
          >
            <AppIcon :name="item.icon" :size="15" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <div class="admin-side-foot">
          <NuxtLink to="/" class="back-link">
            <AppIcon name="arrowLeft" :size="13" />
            返回前台
          </NuxtLink>
          <span v-if="auth.user.value" class="operator">
            <UserAvatar :name="auth.user.value.nickname" :username="auth.user.value.username" :avatar="auth.user.value.avatar" :size="26" />
            {{ auth.user.value.nickname || auth.user.value.username }}
          </span>
        </div>
      </aside>

      <main id="admin-content" class="admin-main" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
}
.admin-layout {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr);
  gap: clamp(24px, 3.5vw, 52px);
  min-height: calc(100vh - var(--header-height));
  padding-top: 30px;
  padding-bottom: 80px;
}

.admin-side {
  position: sticky;
  top: calc(var(--header-height) + 28px);
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding: 20px 20px 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: rgba(15, 18, 24, 0.55);
  backdrop-filter: blur(18px);
}

.admin-side-head {
  display: grid;
  gap: 6px;
}
.admin-eyebrow {
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.18em;
}
.admin-side-head strong {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.admin-side-head small {
  color: var(--muted-weak);
  font-size: 9.5px;
  line-height: 1.6;
}

.admin-nav {
  display: grid;
  gap: 3px;
}
.admin-nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-radius: 9px;
  color: var(--muted);
  font-size: 11.5px;
  transition: 160ms ease;
}
.admin-nav a:hover {
  color: var(--ink);
  background: rgba(243, 239, 228, 0.05);
}
.admin-nav a.is-active {
  color: var(--ink);
  background: rgba(243, 184, 95, 0.1);
  box-shadow: inset 2px 0 0 var(--amber);
}
.admin-nav a.is-active :deep(svg) {
  color: var(--amber);
}

.admin-side-foot {
  display: grid;
  gap: 14px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 10px;
}
.back-link:hover {
  color: var(--ink);
}
.operator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 10px;
}

.admin-main {
  min-width: 0;
}

@media (max-width: 900px) {
  .admin-layout {
    grid-template-columns: 1fr;
    gap: 22px;
    padding-top: 18px;
  }
  .admin-side {
    position: static;
    gap: 16px;
    padding: 15px;
  }
  .admin-side-head small,
  .admin-side-foot {
    display: none;
  }
  .admin-nav {
    display: flex;
    overflow-x: auto;
    gap: 4px;
    padding-bottom: 2px;
  }
  .admin-nav a {
    flex: 0 0 auto;
    padding: 8px 11px;
    white-space: nowrap;
  }
  .admin-nav a.is-active {
    box-shadow: inset 0 -2px 0 var(--amber);
  }
}
</style>
