<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  totalPages: number
}>()

const emit = defineEmits<{ 'update:page': [page: number] }>()

const pages = computed(() => {
  const total = props.totalPages
  const current = props.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, total, current - 1, current, current + 1])
  const sorted = [...set].filter(page => page >= 1 && page <= total).sort((a, b) => a - b)
  const result: Array<number | '…'> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1]! > 1) result.push('…')
    result.push(page)
  })
  return result
})

function go(page: number) {
  if (page < 1 || page > props.totalPages || page === props.page) return
  emit('update:page', page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pager" aria-label="分页">
    <button class="pager-btn" type="button" :disabled="page <= 1" aria-label="上一页" @click="go(page - 1)">
      <AppIcon name="chevronLeft" :size="15" />
    </button>
    <template v-for="(item, index) in pages" :key="`${item}-${index}`">
      <span v-if="item === '…'" class="pager-gap">…</span>
      <button
        v-else
        class="pager-btn"
        :class="{ 'is-active': item === page }"
        type="button"
        @click="go(item as number)"
      >
        {{ item }}
      </button>
    </template>
    <button class="pager-btn" type="button" :disabled="page >= totalPages" aria-label="下一页" @click="go(page + 1)">
      <AppIcon name="chevronRight" :size="15" />
    </button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 42px;
}
.pager-btn {
  display: grid;
  min-width: 36px;
  height: 36px;
  padding: 0 9px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50px;
  color: var(--muted);
  background: transparent;
  font-size: 11.5px;
  font-weight: 650;
  cursor: pointer;
  transition: 160ms ease;
}
.pager-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--line-strong);
  background: rgba(243, 239, 228, 0.05);
}
.pager-btn.is-active {
  color: #171208;
  border-color: var(--amber);
  background: var(--amber);
}
.pager-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pager-gap {
  padding: 0 4px;
  color: var(--muted-weak);
  font-size: 11px;
}
</style>
