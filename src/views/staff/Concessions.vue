<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../../api'
import { useToast } from '../../composables/useToast'

const toast = useToast()
const list = ref([])
const loading = ref(true)
const error = ref('')
const drafts = ref({})
const savingId = ref(0)

const totalStock = computed(() => list.value.reduce((sum, item) => sum + (item.stockQuantity || 0), 0))
const lowCount = computed(() => list.value.filter((item) => item.stockQuantity > 0 && item.stockQuantity <= 5).length)
const emptyCount = computed(() => list.value.filter((item) => item.stockQuantity <= 0).length)

const items = computed(() =>
  [...list.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'vi'))
)

function isDirty(item) {
  return Number(drafts.value[item.id]) !== Number(item.stockQuantity ?? 0)
}

function stockTone(item) {
  if (item.stockQuantity <= 0) return 'empty'
  if (item.stockQuantity <= 5) return 'low'
  return 'ok'
}

function stockLabel(item) {
  if (item.stockQuantity <= 0) return 'Hết hàng'
  if (item.stockQuantity <= 5) return 'Sắp hết'
  return 'Còn hàng'
}

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    list.value = (await apiFetch('/api/staff/concessions')) ?? []
    const next = {}
    for (const item of list.value) next[item.id] = item.stockQuantity ?? 0
    drafts.value = next
  } catch (e) {
    error.value = e.message || 'Không tải được bắp nước'
  } finally {
    loading.value = false
  }
}

function bump(item, delta) {
  const next = Math.max(0, (drafts.value[item.id] ?? item.stockQuantity ?? 0) + delta)
  drafts.value = { ...drafts.value, [item.id]: next }
}

async function save(item) {
  const stockQuantity = Math.max(0, Number(drafts.value[item.id]) || 0)
  savingId.value = item.id
  try {
    await apiFetch(`/api/staff/concessions/${item.id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ stockQuantity }),
    })
    item.stockQuantity = stockQuantity
    drafts.value = { ...drafts.value, [item.id]: stockQuantity }
    toast.success(`Đã cập nhật ${item.name}`)
  } catch (e) {
    toast.error(e.message || 'Không lưu được số lượng')
  } finally {
    savingId.value = 0
  }
}

onMounted(fetchAll)
</script>

<template>
  <div class="stock-page">
    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title">Bắp nước</h2>
          <p class="page-sub">Số còn trừ khi bán vé hoặc khách đặt online. Hủy đơn thì cộng lại. Nhập thêm hàng rồi bấm Lưu.</p>
        </div>
      </div>

      <div class="work">
        <section class="panel">
          <h3 class="panel-step">
            <span class="step-num">1</span> Món trong quầy
            <span class="seat-count">{{ items.length }} món</span>
          </h3>

          <p v-if="!items.length" class="empty">Chưa có món.</p>
          <div v-else class="grid">
            <article
              v-for="item in items"
              :key="item.id"
              class="snack-card"
              :class="[stockTone(item), { dirty: isDirty(item) }]"
            >
              <div class="photo">
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                <span class="pill" :class="stockTone(item)">{{ stockLabel(item) }}</span>
              </div>
              <div class="snack-body">
                <p class="cat">{{ item.category || 'Khác' }}</p>
                <strong>{{ item.name }}</strong>
                <span class="price">{{ Number(item.price).toLocaleString('vi-VN') }}₫</span>
                <span class="left"><b>{{ item.stockQuantity }}</b> còn lại</span>
                <p v-if="!item.isActive" class="hidden">Đang ẩn trên web</p>
                <div class="qty">
                  <button type="button" aria-label="Giảm" @click="bump(item, -1)">−</button>
                  <input v-model.number="drafts[item.id]" type="number" min="0" aria-label="Số lượng còn" />
                  <button type="button" aria-label="Tăng" @click="bump(item, 1)">+</button>
                </div>
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="!isDirty(item) || savingId === item.id"
                  @click="save(item)"
                >
                  {{ savingId === item.id ? 'Đang lưu...' : isDirty(item) ? 'Lưu' : 'Đã lưu' }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <aside class="summary-box">
          <h4>Tồn kho</h4>
          <div class="summary-row">
            <span class="summary-label">Tổng còn trong quầy</span>
            <span class="summary-value">{{ totalStock }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Sắp hết</span>
            <span class="summary-value warn">{{ lowCount }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Hết hàng</span>
            <span class="summary-value bad">{{ emptyCount }}</span>
          </div>
          <div class="summary-row total">
            <span>Món đang bán</span>
            <span class="total-amount">{{ items.length }}</span>
          </div>
          <p class="hint">Sắp hết khi còn từ 1 đến 5. Thẻ viền xanh là số vừa sửa, bấm Lưu để ghi vào quầy.</p>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stock-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 1200px; margin: 0 auto; }

.state { padding: 3rem; text-align: center; color: var(--text-muted); }
.state.error { color: #fca5a5; }
.spinner {
  width: 40px; height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.page-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.page-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; }
.page-sub { color: var(--text-muted); font-size: 0.9rem; margin: 0.35rem 0 0; max-width: 62ch; }

.work {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(240px, 0.7fr);
  gap: 1rem;
  align-items: start;
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}
.panel-step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1.25rem;
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
}
.seat-count { margin-left: auto; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
.empty { padding: 1.5rem; text-align: center; color: var(--text-muted); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}
.snack-card {
  display: flex;
  flex-direction: column;
  background: #161616;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  min-width: 0;
}
.snack-card.dirty {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.28);
}
.snack-card.low { border-color: rgba(234, 179, 8, 0.7); }
.snack-card.empty { border-color: rgba(220, 38, 38, 0.8); }
.snack-card.dirty.low,
.snack-card.dirty.empty { border-color: #3b82f6; }
.photo { position: relative; height: 108px; background: #0b0b0b; }
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pill {
  position: absolute;
  left: 0.55rem;
  bottom: 0.55rem;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
}
.pill.ok { color: #86efac; }
.pill.low { color: #fde68a; }
.pill.empty { color: #fca5a5; }
.snack-body { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.7rem 0.75rem 0.8rem; flex: 1; }
.cat { margin: 0; color: var(--text-muted); font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; }
.snack-body strong { font-size: 0.92rem; line-height: 1.25; }
.price { color: var(--accent-gold); font-size: 0.85rem; font-weight: 700; }
.left { color: var(--text-muted); font-size: 0.78rem; }
.left b { color: #fff; font-size: 1.05rem; margin-right: 0.15rem; }
.hidden { margin: 0; color: #fca5a5; font-size: 0.75rem; }
.qty {
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.45rem;
}
.qty input, .qty button {
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #0b0b0b;
  color: #fff;
  font-family: inherit;
}
.qty input { width: 100%; text-align: center; font-weight: 800; }
.qty button { cursor: pointer; font-size: 1rem; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.55rem;
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.28);
}
.btn-primary:hover:not(:disabled) { background: #2563eb; }
.btn-primary:disabled { opacity: 0.45; cursor: default; box-shadow: none; }

.summary-box {
  padding: 1.15rem 1.1rem;
  background: #12151c;
  border: 1px solid rgba(59, 130, 246, 0.28);
  border-radius: 16px;
  position: sticky;
  top: 1rem;
}
.summary-box h4 { margin: 0 0 0.65rem; font-size: 0.95rem; }
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0;
  font-size: 0.9rem;
}
.summary-label { color: var(--text-muted); }
.summary-value { color: var(--text-primary); font-weight: 800; font-size: 1.15rem; }
.summary-value.warn { color: #fde68a; }
.summary-value.bad { color: #fca5a5; }
.summary-row.total {
  border-top: 1px solid rgba(59, 130, 246, 0.25);
  margin-top: 0.45rem;
  padding-top: 0.75rem;
}
.total-amount { color: var(--accent-gold); font-weight: 800; font-size: 1.25rem; }
.hint { margin: 0.85rem 0 0; color: var(--text-muted); font-size: 0.8rem; line-height: 1.45; }

@media (max-width: 900px) {
  .work { grid-template-columns: 1fr; }
  .summary-box { position: static; }
}
</style>
