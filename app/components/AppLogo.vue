<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const siteSettings = useSiteSettings()
</script>

<template>
  <span class="brand" :class="{ 'brand--compact': compact }">
    <span class="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <rect x="3.5" y="3.5" width="23" height="23" rx="6.2" stroke="currentColor" stroke-opacity=".5" />
        <g fill="currentColor" opacity=".38">
          <rect x="8" y="9" width="3.2" height="2.4" rx="1.1" />
          <rect x="8" y="14.2" width="3.2" height="2.4" rx="1.1" />
          <rect x="8" y="19.4" width="3.2" height="2.4" rx="1.1" />
        </g>
        <rect x="15" y="14.5" width="21" height="21" rx="6" fill="var(--amber)" />
        <path d="M23 20.8 31.8 25 23 29.2Z" fill="#171208" />
        <path d="M30.8 3.8h4.4v4.4" stroke="var(--amber)" stroke-width="1.8" stroke-linecap="round" stroke-opacity=".8" />
      </svg>
    </span>
    <span v-if="!compact" class="brand-word">
      <strong>{{ siteSettings.name }}</strong>
      <small>BUDANG ARCHIVE</small>
    </span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
  line-height: 1;
}

.brand-mark {
  position: relative;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: var(--amber);
  filter: drop-shadow(0 0 18px rgba(243, 184, 95, 0.2));
  transition: transform 600ms var(--ease-out);
}

.brand:hover .brand-mark {
  transform: rotate(7deg) scale(1.04);
}

.brand-mark svg {
  width: 100%;
  height: 100%;
}

.brand-word {
  display: grid;
  gap: 4px;
}

.brand-word strong {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.brand-word small {
  color: var(--muted-weak);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.22em;
}
</style>
