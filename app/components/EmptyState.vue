<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  text?: string
  icon?: string
}>(), {
  text: '',
  icon: 'film',
})
</script>

<template>
  <div class="empty">
    <span class="empty__mark">
      <AppIcon :name="icon" :size="23" />
    </span>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="text" class="empty__text">{{ text }}</p>
    <div v-if="$slots.default" class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}
</style>
