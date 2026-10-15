<script setup>
import { useToast } from '../composables/useToast'
import AppIcon from './AppIcon.vue'

const { toasts, remove } = useToast()

const iconMap = {
  success: 'check',
  error: 'x',
  warning: 'warning',
  info: 'info',
}

function getIcon(type) {
  return iconMap[type] || 'info'
}
</script>

<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
        @click="remove(toast.id)"
      >
        <div class="toast-icon">
          <AppIcon :name="getIcon(toast.type)" :size="18" />
        </div>
        <div class="toast-message">{{ toast.message }}</div>
        <button class="toast-close" @click.stop="remove(toast.id)">
          <AppIcon name="x" :size="14" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
  max-width: 420px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: #1a1a1a;
  border: 1px solid var(--border-strong);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  cursor: pointer;
  min-width: 300px;
  transition: all 0.2s;
}
.toast:hover {
  transform: translateX(-4px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.toast-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

/* ========== TYPES ========== */
.toast.success {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), #1a1a1a);
}
.toast.success .toast-icon {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.toast.error {
  border-color: rgba(248, 113, 113, 0.4);
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.15), #1a1a1a);
}
.toast.error .toast-icon {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.toast.warning {
  border-color: rgba(234, 179, 8, 0.4);
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), #1a1a1a);
}
.toast.warning .toast-icon {
  background: rgba(234, 179, 8, 0.2);
  color: #fbbf24;
}

.toast.info {
  border-color: rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), #1a1a1a);
}
.toast.info .toast-icon {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

/* ========== TRANSITIONS ========== */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-move {
  transition: transform 0.3s ease;
}

@media (max-width: 640px) {
  .toast-container {
    top: 1rem;
    right: 1rem;
    left: 1rem;
    max-width: none;
  }
  .toast {
    min-width: 0;
  }
}
</style>