<script setup>
import { onMounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import AdminPager from '../../components/AdminPager.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'

const toast = useToast()
const list = ref([])
const { page, pageCount, total, items: pageItems } = usePager(list)
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  name: '',
  code: '',
  kind: 'Percent',
  value: 10,
  weekday: 2,
  minSubtotal: 0,
  maxDiscount: null,
  usageLimit: 1,
  startsAt: '',
  endsAt: '',
  appliesTo: 'All',
  note: '',
  isActive: true,
})
const form = ref(emptyForm())

const weekdays = [
  { id: 0, name: 'Chủ nhật' },
  { id: 1, name: 'Thứ 2' },
  { id: 2, name: 'Thứ 3' },
  { id: 3, name: 'Thứ 4' },
  { id: 4, name: 'Thứ 5' },
  { id: 5, name: 'Thứ 6' },
  { id: 6, name: 'Thứ 7' },
]

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    list.value = (await apiFetch('/api/admin/promotions')) ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    name: item.name,
    code: item.code || '',
    kind: item.kind,
    value: item.value,
    weekday: item.weekday ?? 2,
    minSubtotal: item.minSubtotal,
    maxDiscount: item.maxDiscount,
    usageLimit: item.usageLimit,
    startsAt: item.startsAt ? item.startsAt.slice(0, 10) : '',
    endsAt: item.endsAt ? item.endsAt.slice(0, 10) : '',
    appliesTo: item.appliesTo,
    note: item.note || '',
    isActive: item.isActive,
  }
  formError.value = ''
  showModal.value = true
}

function payload() {
  return {
    name: form.value.name.trim(),
    code: form.value.code.trim() || null,
    kind: form.value.kind,
    value: Number(form.value.value) || 0,
    weekday: form.value.kind === 'Weekday' ? Number(form.value.weekday) : null,
    minSubtotal: Number(form.value.minSubtotal) || 0,
    maxDiscount: form.value.maxDiscount === '' || form.value.maxDiscount == null ? null : Number(form.value.maxDiscount),
    usageLimit: form.value.usageLimit === '' || form.value.usageLimit == null ? null : Number(form.value.usageLimit),
    startsAt: form.value.startsAt || null,
    endsAt: form.value.endsAt || null,
    appliesTo: form.value.appliesTo,
    note: form.value.note.trim(),
    isActive: form.value.isActive,
  }
}

async function save() {
  formError.value = ''
  if (!form.value.name.trim()) {
    formError.value = 'Nhập tên chương trình'
    return
  }
  saving.value = true
  try {
    const path = editing.value ? `/api/admin/promotions/${editing.value.id}` : '/api/admin/promotions'
    await apiFetch(path, {
      method: editing.value ? 'PUT' : 'POST',
      body: JSON.stringify(payload()),
    })
    showModal.value = false
    await fetchAll()
    toast.success(editing.value ? 'Đã cập nhật' : 'Đã thêm khuyến mãi')
  } catch (e) {
    formError.value = e.message
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}

async function remove(item) {
  if (!confirm(`Xóa "${item.name}"?`)) return
  try {
    await apiFetch(`/api/admin/promotions/${item.id}`, { method: 'DELETE' })
    await fetchAll()
    toast.success('Đã xóa')
  } catch (e) {
    toast.error(e.message)
  }
}

function kindLabel(item) {
  if (item.kind === 'Fixed') return `Giảm ${Number(item.value).toLocaleString('vi-VN')}đ`
  if (item.kind === 'Weekday') {
    const day = weekdays.find((d) => d.id === item.weekday)?.name || ''
    return `${day} · ${item.value}%`
  }
  return `Giảm ${item.value}%`
}

onMounted(fetchAll)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Khuyến mãi / Mã giảm giá</h2>
        <p class="page-sub">Thứ 3 vui vẻ, combo bắp nước, mã sinh nhật. Khách nhập mã khi đặt vé.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openCreate">
        <AppIcon name="plus" :size="16" /> Thêm chương trình
      </button>
    </div>

    <p v-if="loading" class="state">Đang tải...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="!list.length" class="state">Chưa có chương trình.</p>

    <article v-for="item in pageItems" :key="item.id" class="card">
      <div>
        <strong>{{ item.name }}</strong>
        <p>{{ kindLabel(item) }} · áp cho {{ item.appliesTo === 'Ticket' ? 'vé' : item.appliesTo === 'Concession' ? 'bắp nước' : 'cả đơn' }}</p>
        <span class="meta">
          {{ item.code || 'Không cần mã' }} · đã dùng {{ item.usedCount }}{{ item.usageLimit ? `/${item.usageLimit}` : '' }}
          · {{ item.isActive ? 'Đang chạy' : 'Đã tắt' }}
        </span>
      </div>
      <div class="actions">
        <button class="btn" type="button" @click="openEdit(item)">Sửa</button>
        <button class="btn danger" type="button" @click="remove(item)">Xóa</button>
      </div>
    </article>
    <AdminPager v-if="!loading && !error" v-model:page="page" :page-count="pageCount" :total="total" />

    <div v-if="showModal" class="modal-back" @click.self="showModal = false">
      <form class="modal" @submit.prevent="save">
        <div class="modal-head">
          <h3>{{ editing ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi' }}</h3>
          <button type="button" class="close" @click="showModal = false">✕</button>
        </div>
        <label>Tên chương trình<input v-model="form.name" required /></label>
        <label>Mã khách nhập<input v-model="form.code" placeholder="T3VUI" /></label>
        <div class="split">
          <label>
            Kiểu giảm
            <select v-model="form.kind">
              <option value="Percent">Phần trăm</option>
              <option value="Fixed">Số tiền cố định</option>
              <option value="Weekday">Theo thứ trong tuần</option>
            </select>
          </label>
          <label>
            Áp dụng
            <select v-model="form.appliesTo">
              <option value="All">Cả đơn</option>
              <option value="Ticket">Tiền ghế</option>
              <option value="Concession">Bắp nước</option>
            </select>
          </label>
        </div>
        <div class="split">
          <label>{{ form.kind === 'Fixed' ? 'Số tiền giảm' : '% giảm' }}<input v-model.number="form.value" type="number" min="0" /></label>
          <label v-if="form.kind === 'Weekday'">
            Thứ
            <select v-model.number="form.weekday">
              <option v-for="d in weekdays" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </label>
        </div>
        <div class="split">
          <label>Đơn tối thiểu<input v-model.number="form.minSubtotal" type="number" min="0" /></label>
          <label>Giảm tối đa<input v-model="form.maxDiscount" type="number" min="0" /></label>
        </div>
        <div class="split">
          <label>Giới hạn lượt dùng<input v-model="form.usageLimit" type="number" min="1" /> Mỗi mã mặc định 1 lần</label>
          <label class="check"><input v-model="form.isActive" type="checkbox" /> Đang chạy</label>
        </div>
        <div class="split">
          <label>Bắt đầu<input v-model="form.startsAt" type="date" /></label>
          <label>Kết thúc<input v-model="form.endsAt" type="date" /></label>
        </div>
        <label>Ghi chú<textarea v-model="form.note" rows="2" /></label>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="modal-foot">
          <button type="button" class="btn" @click="showModal = false">Hủy</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Đang lưu...' : 'Lưu' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 0.85rem; }
.page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.page-title { margin: 0; }
.page-sub, .state, .meta { color: var(--text-muted); }
.state.error, .form-error { color: #fca5a5; }
.card {
  display: flex; justify-content: space-between; gap: 1rem; align-items: center;
  padding: 1rem 1.1rem; background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
}
.card p { margin: 0.25rem 0; color: var(--text-secondary); }
.actions { display: flex; gap: 0.5rem; }
.btn {
  display: inline-flex; align-items: center; gap: 0.35rem;
  border: 1px solid rgba(255,255,255,0.16); background: transparent; color: #fff;
  border-radius: 8px; padding: 0.45rem 0.75rem; cursor: pointer; font-family: inherit;
}
.btn-primary { background: var(--accent-red); border-color: var(--accent-red); }
.danger { color: #fca5a5; }
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,0.78); display: grid; place-items: center; z-index: 400; padding: 1rem; }
.modal {
  width: min(560px, 100%); padding: 1.15rem; display: grid; gap: 0.75rem; max-height: calc(100vh - 2rem);
  overflow: auto; background: #141414; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
}
.modal-head, .modal-foot, .split { display: flex; justify-content: space-between; gap: 0.75rem; }
.modal h3 { margin: 0; }
.close { width: 32px; height: 32px; border: none; background: transparent; color: #cbd5e1; cursor: pointer; }
.modal label { display: grid; gap: 0.35rem; color: #cbd5e1; font-size: 0.85rem; flex: 1; }
.modal input, .modal textarea, .modal select {
  padding: 0.7rem 0.8rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14);
  background: #0b0b0b; color: #fff; font-family: inherit;
}
.check { display: flex !important; flex-direction: row; align-items: center; gap: 0.45rem; }
.modal-foot { justify-content: flex-end; }
</style>
