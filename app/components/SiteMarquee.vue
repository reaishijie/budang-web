<template>
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">
      <span v-for="index in 2" :key="index" class="marquee-group">
        <em>CURATED CINEMA</em><i>✦</i>
        <em>独立影像放映室</em><i>✦</i>
        <em>NO ALGORITHM</em><i>✦</i>
        <em>JUST GOOD FILMS</em><i>✦</i>
        <em>光影放映中</em><i>✦</i>
      </span>
    </div>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  padding: 18px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: rgba(8, 9, 12, 0.35);
}
.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee 32s linear infinite;
}
.marquee-group {
  display: flex;
  align-items: center;
  gap: 26px;
  padding-right: 26px;
}
.marquee-group em {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-style: normal;
  letter-spacing: 0.22em;
  white-space: nowrap;
}
.marquee-group i {
  color: var(--amber);
  font-size: 9px;
  font-style: normal;
  opacity: 0.65;
}

@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}
</style>
