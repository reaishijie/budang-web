<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  width?: string
}>(), {
  description: '',
  width: '520px',
})

const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(() => props.open, (open) => {
  if (!import.meta.client) return
  if (open) {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-root" @click.self="emit('close')">
        <div
          class="modal-panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :style="{ maxWidth: width }"
        >
          <header class="modal-head">
            <div>
              <p v-if="description" class="modal-eyebrow">{{ description }}</p>
              <h2 class="modal-title">{{ title }}</h2>
            </div>
            <button class="modal-close" type="button" aria-label="关闭" @click="emit('close')">
              <AppIcon name="close" :size="16" />
            </button>
          </header>
          <div class="modal-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  overflow-y: auto;
  padding: 28px 18px;
  place-items: center;
  background: rgba(3, 4, 6, 0.72);
  backdrop-filter: blur(10px);
}

.modal-panel {
  width: 100%;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(150deg, rgba(243, 184, 95, 0.05), transparent 32%),
    #11141b;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.65);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 26px 18px;
  border-bottom: 1px solid var(--line);
}

.modal-eyebrow {
  margin-bottom: 7px;
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 25px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.modal-close {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: 160ms ease;
}
.modal-close:hover {
  color: var(--ink);
  border-color: var(--line-strong);
  background: rgba(243, 239, 228, 0.05);
}

.modal-body {
  padding: 22px 26px 26px;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 26px 22px;
  border-top: 1px solid var(--line);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 260ms var(--ease-out), opacity 200ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: translateY(16px) scale(0.985);
}

@media (max-width: 560px) {
  .modal-root {
    padding: 14px;
    place-items: end center;
  }
  .modal-head,
  .modal-body {
    padding-left: 18px;
    padding-right: 18px;
  }
  .modal-foot {
    padding: 14px 18px 18px;
  }
}
</style>
