<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { apiFetch } from '../../api'

const toast = useToast()

const qrInput = ref('')
const scanning = ref(false)
const reading = ref(false)
const lastResult = ref(null)
const history = ref([])
const fileInput = ref(null)
const previewUrl = ref('')

async function readQrFile(file) {
  if (!file) return
  reading.value = true
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  try {
    if (!('BarcodeDetector' in window)) {
      toast.warning('Trình duyệt này không đọc ảnh QR. Hãy gõ mã chữ in dưới QR.')
      return
    }
    const bitmap = await createImageBitmap(file)
    const detector = new BarcodeDetector({ formats: ['qr_code'] })
    const codes = await detector.detect(bitmap)
    bitmap.close?.()
    const value = codes[0]?.rawValue?.trim()
    if (!value) {
      toast.error('Không thấy mã QR trong ảnh. Thử ảnh rõ hơn, hoặc gõ mã chữ dưới QR.')
      return
    }
    qrInput.value = value
    await checkIn()
  } catch (e) {
    toast.error(e.message || 'Không đọc được ảnh QR')
  } finally {
    reading.value = false
  }
}

function onPaste(event) {
  const items = event.clipboardData?.items
  if (!items) return
  const image = [...items].find((item) => item.type.startsWith('image/'))
  if (!image) return
  event.preventDefault()
  readQrFile(image.getAsFile())
}

function onDrop(event) {
  const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith('image/'))
  if (file) readQrFile(file)
}

function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) readQrFile(file)
}

onMounted(() => window.addEventListener('paste', onPaste))
onUnmounted(() => {
  window.removeEventListener('paste', onPaste)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

async function checkIn() {
  const code = qrInput.value.trim()
  if (!code) {
    toast.warning('Vui lòng nhập mã QR')
    return
  }

  scanning.value = true
  try {
    const json = await apiFetch('/api/staff/checkin-qr', {
      method: 'POST',
      raw: true,
      body: JSON.stringify({ qrCode: code }),
    })

    lastResult.value = {
      success: true,
      message: json?.message || 'Check-in thành công',
      code,
      time: new Date(),
    }

    history.value.unshift(lastResult.value)
    if (history.value.length > 10) history.value.pop()

    toast.success('Vé hợp lệ, cho khách vào phòng')
    qrInput.value = ''
  } catch (e) {
    lastResult.value = {
      success: false,
      message: e.message,
      code,
      time: new Date(),
    }
    toast.error('Check-in thất bại: ' + e.message)
  } finally {
    scanning.value = false
  }
}

function clearHistory() {
  history.value = []
  lastResult.value = null
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('vi-VN')
}
</script>

<template>
  <div class="checkin-page">
    <div class="scan-card">
      <div class="scan-icon">
        <AppIcon name="qrcode" :size="48" />
      </div>
      <h2 class="scan-title">Soát vé vào phòng</h2>
      <p class="scan-desc">
        Chụp hoặc copy ảnh QR trên vé, rồi dán vào ô bên dưới. Bấm ô đó và nhấn Ctrl+V.
      </p>

      <form @submit.prevent="checkIn" class="scan-form">
        <div
          class="drop"
          tabindex="0"
          @dragover.prevent
          @drop.prevent="onDrop"
          @click="fileInput?.click()"
        >
          <img v-if="previewUrl" :src="previewUrl" alt="Ảnh QR vừa dán" />
          <template v-else>
            <strong>{{ reading ? 'Đang đọc ảnh...' : 'Dán ảnh QR vào ô này' }}</strong>
            <span>Ctrl+V, kéo ảnh vào, hoặc bấm để chọn file</span>
          </template>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />

        <p class="or">Hoặc gõ mã chữ in dưới QR</p>
        <div class="input-wrap">
          <AppIcon name="qrcode" :size="20" class="input-icon" />
          <input
            v-model="qrInput"
            type="text"
            class="scan-input"
            placeholder="Mã chữ dưới QR, ví dụ BK18-S3-..."
          />
        </div>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="scanning || !qrInput.trim()"
        >
          <AppIcon name="check" :size="18" />
          <span>{{ scanning ? 'Đang xử lý...' : 'Xác nhận vé' }}</span>
        </button>
      </form>

      <!-- Kết quả -->
      <div v-if="lastResult" class="result" :class="lastResult.success ? 'success' : 'error'">
        <div class="result-icon">
          <AppIcon :name="lastResult.success ? 'check' : 'x'" :size="24" />
        </div>
        <div class="result-content">
          <div class="result-title">
            {{ lastResult.success ? 'Cho vào phòng' : 'Không cho vào' }}
          </div>
          <div class="result-message">{{ lastResult.message }}</div>
          <div class="result-code">Mã: {{ lastResult.code }}</div>
        </div>
      </div>
    </div>

    <!-- Lịch sử -->
    <div v-if="history.length" class="history-card">
      <div class="history-head">
        <h3 class="history-title">Vé vừa soát</h3>
        <button class="btn-clear" @click="clearHistory">
          <AppIcon name="trash" :size="14" />
          <span>Xóa</span>
        </button>
      </div>
      <div class="history-list">
        <div
          v-for="(h, i) in history"
          :key="i"
          class="history-item"
          :class="h.success ? 'success' : 'error'"
        >
          <div class="history-icon">
            <AppIcon :name="h.success ? 'check' : 'x'" :size="14" />
          </div>
          <div class="history-content">
            <div class="history-code">{{ h.code }}</div>
            <div class="history-message">{{ h.message }}</div>
          </div>
          <div class="history-time">{{ formatTime(h.time) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkin-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 720px;
  margin: 0 auto;
}

.scan-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  text-align: center;
}

.scan-icon {
  width: 96px; height: 96px;
  margin: 0 auto 1.5rem;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
}

.scan-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}
.scan-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0 0 2rem;
}

.scan-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 480px;
  margin: 0 auto;
}
.drop {
  min-height: 148px;
  border: 2px dashed rgba(59, 130, 246, 0.7);
  border-radius: 16px;
  background: rgba(59, 130, 246, 0.08);
  display: grid;
  place-items: center;
  gap: 0.35rem;
  padding: 1rem;
  cursor: pointer;
}
.drop:focus { outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25); }
.drop strong { font-size: 1.05rem; }
.drop span { color: var(--text-muted); font-size: 0.85rem; }
.drop img { max-height: 120px; max-width: 100%; object-fit: contain; background: #fff; border-radius: 8px; }
.or { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.82rem; }
.input-wrap {
  position: relative;
}
.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.scan-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.4);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: monospace;
  letter-spacing: 0.02em;
}
.scan-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.scan-input::placeholder { color: var(--text-dim); font-family: inherit; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.2s;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 0 24px rgba(59, 130, 246, 0.35);
}
.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.result {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--radius-md);
  margin-top: 1.5rem;
  text-align: left;
}
.result.success {
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.result.error {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
}
.result-icon {
  width: 44px; height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.result.success .result-icon {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}
.result.error .result-icon {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}
.result-content { flex: 1; text-align: left; }
.result-title {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.35rem;
}
.result.success .result-title { color: #22c55e; }
.result.error .result-title { color: #f87171; }
.result-message {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.35rem;
}
.result-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  word-break: break-all;
}

/* History */
.history-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.history-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.btn-clear {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-clear:hover { background: rgba(248, 113, 113, 0.15); color: #f87171; }

.history-list { display: flex; flex-direction: column; gap: 0.5rem; }
.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid;
}
.history-item.success { border-color: #22c55e; }
.history-item.error { border-color: #f87171; }
.history-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.history-item.success .history-icon {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.history-item.error .history-icon {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}
.history-content { flex: 1; min-width: 0; }
.history-code {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-message {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}
.history-time {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: monospace;
}
</style>