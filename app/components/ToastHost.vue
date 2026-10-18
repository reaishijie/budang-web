<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const toast = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-host" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="item in toast.items.value"
          :key="item.id"
          class="toast"
          :class="`toast--${item.tone}`"
          role="status"
        >
          <span class="toast-icon">
            <AppIcon :name="item.tone === 'success' ? 'check' : item.tone === 'error' ? 'alert' : 'info'" :size="15" />
          </span>
          <span class="toast-text">{{ item.message }}</span>
          <button class="toast-close" type="button" aria-label="关闭提示" @click="toast.dismiss(item.id)">
            <AppIcon name="close" :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 10001;
  display: grid;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 13px 13px 15px;
  border: 1px solid var(--line-strong);
  border-radius: 13px;
  color: var(--ink-soft);
  background: rgba(17, 20, 27, 0.92);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
  font-size: 12.5px;
  line-height: 1.5;
  pointer-events: auto;
  backdrop-filter: blur(18px);
}

.toast-icon {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
}
.toast--success .toast-icon {
  color: var(--success);
  background: rgba(146, 214, 164, 0.12);
}
.toast--error .toast-icon {
  color: var(--danger);
  background: rgba(255, 123, 111, 0.12);
}
.toast--info .toast-icon {
  color: var(--amber);
  background: var(--amber-soft);
}

.toast-text {
  flex: 1;
}

.toast-close {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
}
.toast-close:hover {
  color: var(--ink);
  background: rgba(243, 239, 228, 0.07);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 220ms ease, transform 280ms var(--ease-out);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}
.toast-move {
  transition: transform 220ms var(--ease-out);
}

@media (max-width: 560px) {
  .toast-host {
    right: 16px;
    bottom: 16px;
  }
}
</style>
