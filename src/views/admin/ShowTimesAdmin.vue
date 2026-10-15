<script setup>
import { ref, onMounted, computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import AdminPager from '../../components/AdminPager.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'

const toast = useToast()

const list = ref([])
const movies = ref([])
const rooms = ref([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')

const form = ref({
  movieId: '',
  roomId: '',
  startTime: '',
})

const sortedList = computed(() =>
  [...list.value].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
)

const { page, pageCount, total, items: pageItems } = usePager(sortedList)

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    const [showtimes, movieList, roomList] = await Promise.all([
      apiFetch('/api/admin/showtimes'),
      apiFetch('/api/admin/movies'),
      apiFetch('/api/admin/rooms'),
    ])
    list.value = showtimes ?? []
    movies.value = movieList ?? []
    rooms.value = roomList ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = {
    movieId: movies.value[0]?.id || '',
    roomId: rooms.value[0]?.id || '',
    startTime: '',
  }
  formError.value = ''
  showModal.value = true
}

function openEdit(st) {
  editing.value = st
  form.value = {
    movieId: st.movieId,
    roomId: st.roomId,
    startTime: st.startTime ? st.startTime.slice(0, 16) : '',
  }
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
  if (!form.value.movieId || !form.value.roomId || !form.value.startTime) {
    formError.value = 'Vui lòng chọn đầy đủ phim, phòng và giờ'
    toast.warning('Vui lòng điền đầy đủ thông tin')
    return
  }

  saving.value = true
  const isEdit = !!editing.value

  try {
    const path = isEdit
      ? `/api/admin/showtimes/${editing.value.id}`
      : '/api/admin/showtimes'
    const method = isEdit ? 'PUT' : 'POST'

    await apiFetch(path, {
      method,
      body: JSON.stringify({
        movieId: Number(form.value.movieId),
        roomId: Number(form.value.roomId),
        startTime: new Date(form.value.startTime).toISOString(),
      }),
    })

    await fetchAll()
    closeModal()
    toast.success(isEdit ? 'Cập nhật suất chiếu thành công' : 'Thêm suất chiếu thành công')
  } catch (e) {
    formError.value = e.message
    toast.error('Lỗi: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function remove(st) {
  if (!confirm(`Xóa suất chiếu #${st.id}?`)) return
  try {
    await apiFetch(`/api/admin/showtimes/${st.id}`, { method: 'DELETE' })
    await fetchAll()
    toast.success(`Đã xóa suất chiếu #${st.id}`)
  } catch (e) {
    toast.error('Không thể xóa: ' + e.message)
  }
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fillPercent(booked, total) {
  if (!total) return 0
  return Math.min(100, (booked / total) * 100)
}

onMounted(fetchAll)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Quản lý suất chiếu</h2>
        <p class="page-sub">{{ list.length }} suất chiếu trong hệ thống</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <AppIcon name="plus" :size="18" />
        <span>Thêm suất chiếu</span>
      </button>
    </div>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="list.length === 0" class="state">Chưa có suất chiếu nào.</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:70px">ID</th>
            <th>Phim</th>
            <th style="width:140px">Phòng</th>
            <th style="width:220px">Thời gian</th>
            <th style="width:180px">Đã đặt</th>
            <th style="width:120px">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="st in pageItems" :key="st.id">
            <td class="cell-id">#{{ st.id }}</td>
            <td>
              <div class="cell-title">{{ st.movieTitle }}</div>
            </td>
            <td>
              <span class="room-tag">{{ st.roomName }}</span>
            </td>
            <td>{{ formatDateTime(st.startTime) }}</td>
            <td>
              <div class="progress-cell">
                <div class="progress-row">
                  <span class="progress-text">{{ st.bookedSeats }}/{{ st.totalSeats }}</span>
                  <span class="progress-percent">
                    {{ Math.round(fillPercent(st.bookedSeats, st.totalSeats)) }}%
                  </span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: fillPercent(st.bookedSeats, st.totalSeats) + '%' }"
                  />
                </div>
              </div>
            </td>
            <td>
              <div class="actions">
                <button class="btn-icon" @click="openEdit(st)" title="Sửa">
                  <AppIcon name="edit" :size="16" />
                </button>
                <button class="btn-icon danger" @click="remove(st)" title="Xóa">
                  <AppIcon name="trash" :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AdminPager v-if="!loading && !error" v-model:page="page" :page-count="pageCount" :total="total" />

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">
          <h3>{{ editing ? 'Sửa suất chiếu' : 'Thêm suất chiếu' }}</h3>
          <button class="modal-close" @click="closeModal">
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>Phim <span class="required">*</span></label>
            <select v-model="form.movieId">
              <option value="">-- Chọn phim --</option>
              <option v-for="m in movies" :key="m.id" :value="m.id">
                {{ m.title }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label>Phòng <span class="required">*</span></label>
            <select v-model="form.roomId">
              <option value="">-- Chọn phòng --</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">
                {{ r.name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label>Thời gian bắt đầu <span class="required">*</span></label>
            <input v-model="form.startTime" type="datetime-local" />
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

.table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table thead { background: rgba(255, 255, 255, 0.03); }
.data-table th {
  text-align: left;
  padding: 0.9rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
}
.data-table td {
  padding: 0.9rem 1rem;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  vertical-align: middle;
}
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }

.cell-id {
  color: var(--accent-gold);
  font-weight: 700;
  font-family: monospace;
}
.cell-title { color: var(--text-primary); font-weight: 600; }

.room-tag {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.progress-cell { display: flex; flex-direction: column; gap: 0.4rem; min-width: 120px; }
.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}
.progress-text { color: var(--text-secondary); font-weight: 600; }
.progress-percent { color: var(--text-muted); font-size: 0.75rem; }
.progress-bar {
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e50914, #fbbf24);
  border-radius: 3px;
  transition: width 0.3s;
}

.actions { display: flex; gap: 0.4rem; }
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px; height: 34px;
  border-radius: 8px;
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

.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: flex; flex-direction: column; gap: 0.45rem; }
.form-row label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.required { color: #f87171; }
.form-row input,
.form-row select {
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
}
.form-row input:focus,
.form-row select:focus {
  outline: none;
  border-color: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
}
.form-row select option { background: #1a1a1a; }

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