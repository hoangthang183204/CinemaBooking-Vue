import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

function remove(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function show(message, type = 'info', duration = 3000) {
  const id = nextId++
  const toast = { id, message, type }
  toasts.value.push(toast)

  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }

  return id
}

export function useToast() {
  return {
    toasts,

    success(message, duration = 3000) {
      return show(message, 'success', duration)
    },

    error(message, duration = 4000) {
      return show(message, 'error', duration)
    },

    warning(message, duration = 3500) {
      return show(message, 'warning', duration)
    },

    info(message, duration = 3000) {
      return show(message, 'info', duration)
    },

    remove,
  }
}