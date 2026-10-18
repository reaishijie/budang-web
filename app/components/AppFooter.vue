<script setup lang="ts">
const siteSettings = useSiteSettings()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <AppLogo />
        <p class="footer-manifesto">
          为一束光、一段沉默和一个好故事，
          <br>
          保留一块安静的银幕。
        </p>
        <span class="footer-mark">EST. 2026 · GUANGYING SCREENING ROOM</span>
      </div>

      <div class="footer-col">
        <h3>探索</h3>
        <NuxtLink to="/">发现</NuxtLink>
        <NuxtLink to="/videos">片库</NuxtLink>
        <NuxtLink to="/rankings">热度榜</NuxtLink>
        <NuxtLink to="/upload">提交影片</NuxtLink>
      </div>

      <div class="footer-col">
        <h3>我的</h3>
        <NuxtLink to="/favorites">收藏</NuxtLink>
        <NuxtLink to="/history">观看历史</NuxtLink>
        <NuxtLink to="/my/videos">我的影片</NuxtLink>
        <NuxtLink to="/account">账户与能量</NuxtLink>
      </div>

      <div class="footer-col footer-note">
        <h3>放映须知</h3>
        <p>光影是一个学习型视频站项目。影片由获得上传权限的创作者提交，经审核后公开放映。</p>
        <p class="footer-tech">Bun · Hono · Prisma · Nuxt</p>
      </div>
    </div>

    <div class="container footer-bottom">
      <span>© {{ year }} {{ siteSettings.name }}. All light reserved.</span>
      <span class="footer-curtain">CURTAIN DOWN · SEE YOU NEXT TIME</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  margin-top: clamp(80px, 10vw, 140px);
  padding-top: 58px;
  border-top: 1px solid var(--line);
  background:
    radial-gradient(700px 300px at 20% 0%, rgba(243, 184, 95, 0.05), transparent 70%),
    rgba(6, 7, 10, 0.45);
}

.footer-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.7fr) repeat(3, minmax(120px, 0.62fr));
  gap: clamp(30px, 5vw, 70px);
  padding-bottom: 52px;
}

.footer-brand {
  display: grid;
  align-content: start;
  gap: 19px;
}
.footer-manifesto {
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1.75;
  letter-spacing: -0.01em;
}
.footer-mark {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
}

.footer-col {
  display: grid;
  align-content: start;
  gap: 10px;
}
.footer-col h3 {
  margin-bottom: 4px;
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.footer-col a {
  width: fit-content;
  color: var(--ink-soft);
  font-size: 11.5px;
  transition: color 160ms ease, transform 160ms ease;
}
.footer-col a:hover {
  color: var(--amber-bright);
  transform: translateX(3px);
}
.footer-note p {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.75;
}
.footer-tech {
  color: var(--muted-weak) !important;
  font-family: var(--font-mono);
  font-size: 8.5px !important;
  letter-spacing: 0.08em;
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 0 26px;
  border-top: 1px solid var(--line);
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
}
.footer-curtain {
  color: var(--muted-weak);
  opacity: 0.75;
}

@media (max-width: 960px) {
  .footer-grid {
    grid-template-columns: 1.4fr 1fr 1fr;
  }
  .footer-note {
    display: none;
  }
}

@media (max-width: 640px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
  .footer-brand {
    grid-column: 1 / -1;
  }
  .footer-bottom {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
  .footer-curtain {
    display: none;
  }
}
</style>
