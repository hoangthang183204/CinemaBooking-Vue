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
  <div class="page">
    <p class="lead">Khách đặt online hoặc mua tại quầy thì số còn bị trừ. Hủy đơn thì cộng lại. Nhập thêm hàng rồi bấm Lưu.</p>

    <div v-if="!loading && !error" class="summary">
      <article>
        <span>Tổng còn trong quầy</span>
        <strong>{{ totalStock }}</strong>
      </article>
      <article class="warn">
        <span>Sắp hết</span>
        <strong>{{ lowCount }}</strong>
      </article>
      <article class="bad">
        <span>Hết hàng</span>
        <strong>{{ emptyCount }}</strong>
      </article>
    </div>

    <p v-if="loading" class="state">Đang tải...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="!list.length" class="state">Chưa có món.</p>

    <div v-else class="grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="card"
        :class="{ low: item.stockQuantity > 0 && item.stockQuantity <= 5, empty: item.stockQuantity <= 0 }"
      >
        <div class="photo">
          <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
          <span class="pill">
            {{ item.stockQuantity <= 0 ? 'Hết hàng' : item.stockQuantity <= 5 ? 'Sắp hết' : 'Còn hàng' }}
          </span>
        </div>
        <div class="body">
          <p class="cat">{{ item.category || 'Khác' }}</p>
          <h4>{{ item.name }}</h4>
          <p class="price">{{ Number(item.price).toLocaleString('vi-VN') }}₫</p>
          <p class="stock"><b>{{ item.stockQuantity }}</b> còn lại</p>
          <p v-if="!item.isActive" class="hidden">Đang ẩn trên web</p>
          <div class="qty">
            <button type="button" aria-label="Giảm" @click="bump(item, -1)">−</button>
            <input v-model.number="drafts[item.id]" type="number" min="0" aria-label="Số lượng còn" />
            <button type="button" aria-label="Tăng" @click="bump(item, 1)">+</button>
            <button type="button" class="save" :disabled="savingId === item.id" @click="save(item)">
              {{ savingId === item.id ? '...' : 'Lưu' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.lead { margin: 0; color: var(--text-muted); max-width: 62ch; }
.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}
.summary article {
  padding: 0.95rem 1.1rem;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}
.summary .warn { border-color: rgba(251, 191, 36, 0.45); }
.summary .bad { border-color: rgba(248, 113, 113, 0.45); }
.summary span { display: block; color: var(--text-muted); font-size: 0.78rem; }
.summary strong { display: block; margin-top: 0.15rem; font-size: 1.8rem; }
.state { color: var(--text-muted); }
.state.error { color: #fca5a5; }
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}
.card {
  display: flex;
  flex-direction: column;
  background: #161616;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  min-width: 0;
}
.card.low { box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.8); }
.card.empty { box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.8); }
.photo { position: relative; height: 132px; background: #0b0b0b; }
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pill {
  position: absolute;
  left: 0.65rem;
  bottom: 0.65rem;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}
.body { padding: 0.8rem 0.9rem 0.9rem; display: flex; flex-direction: column; flex: 1; }
.cat { margin: 0; color: var(--text-muted); font-size: 0.72rem; letter-spacing: 0.04em; text-transform: uppercase; }
.body h4 { margin: 0.15rem 0 0; font-size: 1rem; }
.price { margin: 0.2rem 0 0; color: var(--text-secondary); }
.stock { color: var(--text-muted) !important; font-size: 0.82rem; }
.stock b { color: #fbbf24; font-size: 1.35rem; margin-right: 0.2rem; }
.hidden { color: #fca5a5 !important; font-size: 0.78rem; }
.qty {
  display: grid;
  grid-template-columns: 36px 1fr 36px 72px;
  gap: 0.4rem;
  margin-top: auto;
  padding-top: 0.7rem;
}
.qty input, .qty button {
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #0b0b0b;
  color: #fff;
  border-radius: 10px;
  font-family: inherit;
}
.qty input { width: 100%; text-align: center; }
.qty button { cursor: pointer; }
.save { padding: 0 0.8rem; background: #e50914; border-color: #e50914; font-weight: 700; }
@media (max-width: 860px) {
  .summary, .grid { grid-template-columns: 1fr; }
}
</style>
