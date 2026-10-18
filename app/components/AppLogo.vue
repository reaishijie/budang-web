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
        <circle cx="20" cy="20" r="16.5" stroke="currentColor" stroke-opacity=".34" />
        <circle cx="20" cy="20" r="11.2" stroke="currentColor" stroke-opacity=".5" />
        <path d="M20 3.5v8M20 28.5v8M3.5 20h8M28.5 20h8" stroke="currentColor" stroke-opacity=".55" stroke-linecap="round" />
        <path d="M9.2 9.2 15 15M25 25l5.8 5.8M30.8 9.2 25 15M15 25l-5.8 5.8" stroke="currentColor" stroke-opacity=".28" stroke-linecap="round" />
        <circle cx="20" cy="20" r="4.4" fill="var(--amber)" />
        <circle cx="20" cy="20" r="7.4" stroke="var(--amber)" stroke-opacity=".32" />
      </svg>
    </span>
    <span v-if="!compact" class="brand-word">
      <strong>{{ siteSettings.name }}</strong>
      <small>SCREENING ROOM</small>
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
  transform: rotate(45deg);
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
