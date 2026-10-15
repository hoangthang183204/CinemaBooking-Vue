<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Ảnh' },
})

const emit = defineEmits(['update:modelValue'])
const uploading = ref(false)
const error = ref('')
const input = ref(null)

function pick() {
  input.value?.click()
}

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  error.value = ''
  if (!file.type.startsWith('image/')) {
    error.value = 'Chọn file ảnh.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Ảnh tối đa 5MB.'
    return
  }

  uploading.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const token = localStorage.getItem('cb_token')
    const res = await fetch('/api/uploads', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || 'Không tải ảnh lên được')
    }
    emit('update:modelValue', json?.data?.url || '')
  } catch (err) {
    error.value = err.message || 'Không tải ảnh lên được'
  } finally {
    uploading.value = false
  }
}

function clear() {
  error.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="field">
    <span class="label">{{ label }}</span>
    <div class="box">
      <div class="preview">
        <img v-if="modelValue" :src="modelValue" alt="" />
        <span v-else>Chưa có ảnh</span>
      </div>
      <div class="actions">
        <button type="button" :disabled="uploading" @click="pick">
          {{ uploading ? 'Đang tải...' : modelValue ? 'Đổi ảnh' : 'Chọn ảnh' }}
        </button>
        <button v-if="modelValue" type="button" class="ghost" :disabled="uploading" @click="clear">
          Bỏ ảnh
        </button>
        <p>JPG, PNG, WEBP hoặc GIF, tối đa 5MB. Ảnh được lưu thành file trên máy chủ.</p>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
    <input ref="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden @change="onFile" />
  </div>
</template>

<style scoped>
.field { display: grid; gap: 0.4rem; }
.label { color: var(--text-secondary, #d4d4d4); font-size: 0.85rem; font-weight: 600; }
.box {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 0.85rem;
  align-items: center;
  padding: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: #0b0b0b;
}
.preview {
  width: 112px;
  height: 84px;
  border-radius: 8px;
  overflow: hidden;
  background: #161616;
  display: grid;
  place-items: center;
  color: #8a8a8a;
  font-size: 0.75rem;
}
.preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.actions { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; }
.actions button {
  height: 34px;
  padding: 0 0.8rem;
  border: none;
  border-radius: 8px;
  background: #e50914;
  color: #fff;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
}
.actions button:disabled { opacity: 0.6; cursor: default; }
.ghost { background: transparent !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; }
.actions p { width: 100%; margin: 0; color: #8a8a8a; font-size: 0.75rem; }
.error { color: #fca5a5 !important; }
</style>
