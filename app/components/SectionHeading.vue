<script setup lang="ts">
defineProps<{
  kicker: string
  title: string
  linkTo?: string
  linkLabel?: string
}>()
</script>

<template>
  <div class="section-head">
    <div class="section-head__copy">
      <span class="section-kicker">{{ kicker }}</span>
      <h2 class="section-title">{{ title }}</h2>
    </div>
    <slot>
      <NuxtLink v-if="linkTo" class="section-head__link" :to="linkTo">
        {{ linkLabel || '查看全部' }}
        <AppIcon name="arrowRight" :size="14" />
      </NuxtLink>
    </slot>
  </div>
</template>
