<script setup>
import { ref, onMounted } from 'vue'
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

const form = ref({
  name: '',
  rows: 5,
  seatsPerRow: 8,
  coupleRows: 1,
})

async function fetchList() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch('/api/admin/rooms')
    list.value = data ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', rows: 5, seatsPerRow: 8, coupleRows: 1 }
  formError.value = ''
  showModal.value = true
}

function openEdit(room) {
  editing.value = room
  form.value = { name: room.name, rows: 5, seatsPerRow: 8, coupleRows: 1 }
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  formError.value = ''
}

async function save() {
  formError.value = ''
  if (!form.value.name.trim()) {
    formError.value = 'Tên phòng không được rỗng'
    toast.warning('Vui lòng nhập tên phòng')
    return
  }

  saving.value = true
  const isEdit = !!editing.value

  try {
    const path = isEdit
      ? `/api/admin/rooms/${editing.value.id}`
      : '/api/admin/rooms'
    const method = isEdit ? 'PUT' : 'POST'

    await apiFetch(path, {
      method,
      body: JSON.stringify({
        name: form.value.name.trim(),
        rows: Number(form.value.rows),
        seatsPerRow: Number(form.value.seatsPerRow),
        coupleRows: Number(form.value.coupleRows),
      }),
    })

    await fetchList()
    closeModal()
    toast.success(isEdit ? 'Cập nhật phòng thành công' : 'Thêm phòng thành công')
  } catch (e) {
    formError.value = e.message
    toast.error('Lỗi: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function remove(room) {
  if (!confirm(`Xóa phòng "${room.name}"?`)) return
  try {
    await apiFetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
    await fetchList()
    toast.success(`Đã xóa phòng "${room.name}"`)
  } catch (e) {
    toast.error('Không thể xóa: ' + e.message)
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Quản lý phòng chiếu</h2>
        <p class="page-sub">{{ list.length }} phòng trong hệ thống</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <AppIcon name="plus" :size="18" />
        <span>Thêm phòng</span>
      </button>
    </div>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <div v-else class="card-grid">
      <div v-for="r in pageItems" :key="r.id" class="room-card">
        <div class="room-card-head">
          <div class="room-icon">
            <AppIcon name="room" :size="24" />
          </div>
          <div class="room-actions">
            <button class="btn-icon" @click="openEdit(r)" title="Sửa">
              <AppIcon name="edit" :size="14" />
            </button>
            <button class="btn-icon danger" @click="remove(r)" title="Xóa">
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
        <h3 class="room-name">{{ r.name }}</h3>
        <div class="room-stats">
          <div class="stat">
            <span class="stat-label">Số ghế</span>
            <span class="stat-value">{{ r.seatCount }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Suất chiếu</span>
            <span class="stat-value">{{ r.showTimeCount }}</span>
          </div>
        </div>
      </div>
    </div>
    <AdminPager v-if="!loading && !error" v-model:page="page" :page-count="pageCount" :total="total" />

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">
          <h3>{{ editing ? 'Sửa phòng' : 'Thêm phòng mới' }}</h3>
          <button class="modal-close" @click="closeModal">
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>Tên phòng <span class="required">*</span></label>
            <input v-model="form.name" type="text" placeholder="Ví dụ: Room 1" />
          </div>

          <template v-if="!editing">
            <div class="form-row-2">
              <div class="form-row">
                <label>Số hàng ghế</label>
                <input v-model.number="form.rows" type="number" min="1" max="20" />
              </div>
              <div class="form-row">
                <label>Ghế mỗi hàng</label>
                <input v-model.number="form.seatsPerRow" type="number" min="1" max="20" />
              </div>
            </div>
            <div class="form-row">
              <label>Số hàng ghế đôi (cuối cùng)</label>
              <input v-model.number="form.coupleRows" type="number" min="0" max="5" />
            </div>
            <div class="hint">
              <AppIcon name="ticket" :size="16" />
              <span>Hệ thống sẽ tự sinh ghế: hàng đầu là ghế thường, hàng cuối là ghế đôi.</span>
            </div>
          </template>

          <div v-else class="hint">
            <AppIcon name="ticket" :size="16" />
            <span>Không thể thay đổi layout ghế khi đang sửa phòng.</span>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" @click="closeModal">Hủy</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; }

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}
.page-sub { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0 0; }

.state { padding: 3rem; text-align: center; color: var(--text-muted); }
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.room-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: all 0.2s;
}
.room-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card);
}
.room-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.room-icon {
  width: 48px; height: 48px;
  background: rgba(229, 9, 20, 0.12);
  border: 1px solid rgba(229, 9, 20, 0.25);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fca5a5;
}
.room-actions { display: flex; gap: 0.35rem; }
.room-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.room-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-subtle);
}
.stat { display: flex; flex-direction: column; gap: 0.15rem; }
.stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--accent-gold);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.2s;
}
.btn-primary {
  background: var(--accent-red);
  color: #fff;
  box-shadow: var(--shadow-glow-red);
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-red-hover);
  transform: translateY(-1px);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}
.btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.btn-icon.danger:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.4);
  color: #f87171;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  backdrop-filter: blur(4px);
}
.modal {
  width: 100%;
  max-width: 500px;
  background: #141414;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.modal-head {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-head h3 { margin: 0; font-size: 1.1rem; color: var(--text-primary); font-weight: 700; }
.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.08); color: var(--text-primary); }

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-row { display: flex; flex-direction: column; gap: 0.45rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-row label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.required { color: #f87171; }
.form-row input {
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
}
.form-row input:focus {
  outline: none;
  border-color: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
}

.hint {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: #93c5fd;
  padding: 0.7rem 0.9rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-sm);
}
.hint svg { flex-shrink: 0; margin-top: 0.15rem; }

.form-error {
  color: #fca5a5;
  font-size: 0.85rem;
  padding: 0.7rem 0.9rem;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-sm);
  margin: 0;
}
.modal-foot {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>