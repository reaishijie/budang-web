<script setup lang="ts">
useSeoMeta({ title: '禁止入场' })
</script>

<template>
  <div class="page forbidden-page">
    <div class="container">
      <div class="forbidden-card panel">
        <span class="forbidden-code">403</span>
        <span class="eyebrow">STAFF ONLY · 禁止入场</span>
        <h1>这扇门后面，<br>不是你的放映厅。</h1>
        <p>当前账户没有访问该页面的权限。如果你是管理员，请确认登录账户是否正确。</p>
        <div class="forbidden-actions">
          <NuxtLink class="btn btn-primary" to="/">回到首页</NuxtLink>
          <NuxtLink class="btn btn-ghost" to="/account">查看账户</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forbidden-page {
  display: grid;
  min-height: 70vh;
  place-items: center;
}
.forbidden-card {
  display: grid;
  width: min(640px, 100%);
  justify-items: start;
  gap: 15px;
  padding: clamp(30px, 5vw, 52px);
  background:
    radial-gradient(circle at 82% 10%, rgba(243, 184, 95, 0.1), transparent 46%),
    rgba(15, 18, 24, 0.62);
}
.forbidden-code {
  color: var(--amber);
  font-family: var(--font-display);
  font-size: 96px;
  line-height: 0.8;
}
.forbidden-card h1 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 50px);
  font-weight: 400;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
.forbidden-card p {
  max-width: 440px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.8;
}
.forbidden-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 8px;
}
</style>
