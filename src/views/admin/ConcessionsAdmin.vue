<script setup>
import { onMounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import ImageField from '../../components/ImageField.vue'
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
  description: '',
  price: 25000,
  imageUrl: '',
  category: 'Bắp',
  sortOrder: 1,
  stockQuantity: 40,
  isActive: true,
})
const form = ref(emptyForm())

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    list.value = (await apiFetch('/api/admin/concessions')) ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { ...emptyForm(), sortOrder: list.value.length + 1 }
  formError.value = ''
  showModal.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    name: item.name,
    description: item.description || '',
    price: item.price,
    imageUrl: item.imageUrl || '',
    category: item.category || 'Bắp',
    sortOrder: item.sortOrder ?? 1,
    stockQuantity: item.stockQuantity ?? 0,
    isActive: item.isActive,
  }
  formError.value = ''
  showModal.value = true
}

async function save() {
  formError.value = ''
  if (!form.value.name.trim()) {
    formError.value = 'Nhập tên món'
    return
  }
  saving.value = true
  try {
    const path = editing.value
      ? `/api/admin/concessions/${editing.value.id}`
      : '/api/admin/concessions'
    await apiFetch(path, {
      method: editing.value ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...form.value,
        price: Number(form.value.price) || 0,
        sortOrder: Number(form.value.sortOrder) || 0,
      }),
    })
    showModal.value = false
    await fetchAll()
    toast.success(editing.value ? 'Đã cập nhật món' : 'Đã thêm món')
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
    await apiFetch(`/api/admin/concessions/${item.id}`, { method: 'DELETE' })
    await fetchAll()
    toast.success('Đã xử lý món')
  } catch (e) {
    toast.error(e.message)
  }
}

onMounted(fetchAll)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>Bắp nước</h2>
        <p>Món này hiện khi khách đặt vé và khi bán tại quầy.</p>
      </div>
      <button class="btn primary" @click="openCreate">
        <AppIcon name="plus" :size="16" /> Thêm món
      </button>
    </div>

    <p v-if="loading">Đang tải...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else class="grid">
      <article v-for="item in pageItems" :key="item.id" class="card">
        <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
        <div>
          <strong>{{ item.name }}</strong>
          <p>{{ item.category }} · {{ Number(item.price).toLocaleString('vi-VN') }}₫ · còn {{ item.stockQuantity ?? 0 }}</p>
          <span>{{ item.isActive ? 'Đang bán' : 'Đang ẩn' }}</span>
        </div>
        <div class="actions">
          <button class="btn" @click="openEdit(item)">Sửa</button>
          <button class="btn danger" @click="remove(item)">Xóa</button>
        </div>
      </article>
    </div>
    <AdminPager v-if="!loading && !error" v-model:page="page" :page-count="pageCount" :total="total" />

    <Teleport to="body">
      <div v-if="showModal" class="modal-back" @click.self="showModal = false">
        <form class="modal" @submit.prevent="save">
          <div class="modal-head">
            <h3>{{ editing ? 'Sửa món' : 'Thêm món' }}</h3>
            <button type="button" class="modal-close" @click="showModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <label>Tên món</label>
              <input v-model="form.name" required placeholder="Bắp rang bơ" />
            </div>
            <div class="form-row">
              <label>Mô tả</label>
              <input v-model="form.description" placeholder="Phần vừa, ngọt nhẹ" />
            </div>
            <div class="form-row-2">
              <div class="form-row">
                <label>Giá (đ)</label>
                <input v-model.number="form.price" type="number" min="0" />
              </div>
              <div class="form-row">
                <label>Loại</label>
                <select v-model="form.category">
                  <option>Bắp</option>
                  <option>Nước</option>
                  <option>Combo</option>
                </select>
              </div>
            </div>
            <ImageField v-model="form.imageUrl" label="Ảnh món" />
            <div class="form-row-2">
              <div class="form-row">
                <label>Thứ tự</label>
                <input v-model.number="form.sortOrder" type="number" min="0" />
              </div>
              <div class="form-row">
                <label>Số lượng còn</label>
                <input v-model.number="form.stockQuantity" type="number" min="0" />
              </div>
              <label class="check">
                <input v-model="form.isActive" type="checkbox" />
                Đang bán
              </label>
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" @click="showModal = false">Hủy</button>
            <button class="btn primary" :disabled="saving">{{ saving ? 'Đang lưu...' : 'Lưu' }}</button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-head, .card { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.page-head h2 { margin: 0 0 0.25rem; }
.page-head p, .card p { margin: 0.15rem 0 0; color: var(--text-muted); }
.grid { display: grid; gap: 0.75rem; margin-top: 1rem; }
.card {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 0.85rem 1rem;
}
.card img { width: 72px; height: 72px; object-fit: cover; border-radius: 10px; flex-shrink: 0; }
.card strong { display: block; }
.actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: #fff;
  border-radius: 8px;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  font-family: inherit;
}
.primary { background: var(--accent-red); border-color: var(--accent-red); font-weight: 700; }
.danger { color: #fca5a5; }
.error { color: #fca5a5; }
.modal-back {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}
.modal {
  width: min(520px, 100%);
  max-height: calc(100vh - 2.5rem);
  background: #141414;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}
.modal-head, .modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}
.modal-head { border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.modal-head h3 { margin: 0; font-size: 1.05rem; }
.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
}
.modal-body {
  padding: 1.15rem 1.25rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.form-row { display: flex; flex-direction: column; gap: 0.4rem; }
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  align-items: end;
}
.form-row label { font-size: 0.8rem; font-weight: 650; color: #cbd5e1; }
.form-row input, .form-row select {
  width: 100%;
  box-sizing: border-box;
  padding: 0.72rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #0b0b0b;
  color: #fff;
  font: inherit;
}
.form-row input:focus, .form-row select:focus {
  outline: none;
  border-color: #e50914;
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.18);
}
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  color: #e2e8f0;
}
.form-error {
  margin: 0;
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
}
.modal-foot { border-top: 1px solid rgba(255, 255, 255, 0.08); justify-content: flex-end; }
@media (max-width: 640px) {
  .form-row-2 { grid-template-columns: 1fr; }
}
</style>
