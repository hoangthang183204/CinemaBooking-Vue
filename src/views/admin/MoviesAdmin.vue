<script setup>
import { ref, onMounted, computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import ImageField from '../../components/ImageField.vue'
import AdminPager from '../../components/AdminPager.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'

const toast = useToast()

const list = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')

const form = ref({
  title: '',
  duration: 120,
  isActive: true,
  posterUrl: '',
  genre: '',
  releaseDate: '',
  description: '',
  director: '',
  country: '',
  language: '',
  cast: '',
  trailerUrl: '',
  rating: null,
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return list.value
  return list.value.filter((m) => m.title.toLowerCase().includes(q))
})

const { page, pageCount, total, items: pageItems } = usePager(filtered)

async function fetchList() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch('/api/admin/movies')
    list.value = data ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = {
    title: '',
    duration: 120,
    isActive: true,
    posterUrl: '',
    genre: '',
    releaseDate: '',
    description: '',
    director: '',
    country: '',
    language: '',
    cast: '',
    trailerUrl: '',
    rating: null,
  }
  formError.value = ''
  showModal.value = true
}

function openEdit(movie) {
  editing.value = movie
  form.value = {
    title: movie.title,
    duration: movie.duration,
    isActive: movie.isActive,
    posterUrl: movie.posterUrl || '',
    genre: movie.genre || '',
    releaseDate: movie.releaseDate ? movie.releaseDate.slice(0, 10) : '',
    description: movie.description || '',
    director: movie.director || '',
    country: movie.country || '',
    language: movie.language || '',
    cast: movie.cast || '',
    trailerUrl: movie.trailerUrl || '',
    rating: movie.rating ?? null,
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
  if (!form.value.title.trim()) {
    formError.value = 'Tên phim không được rỗng'
    return
  }
  if (form.value.duration < 1) {
    formError.value = 'Thời lượng phải > 0'
    return
  }

  saving.value = true
  const isEdit = !!editing.value

  try {
    const path = isEdit
      ? `/api/admin/movies/${editing.value.id}`
      : '/api/admin/movies'
    const method = isEdit ? 'PUT' : 'POST'

    const body = {
      title: form.value.title.trim(),
      duration: Number(form.value.duration),
      isActive: form.value.isActive,
      posterUrl: form.value.posterUrl || null,
      genre: form.value.genre || null,
      releaseDate: form.value.releaseDate
        ? new Date(form.value.releaseDate).toISOString()
        : null,
      description: form.value.description || null,
      director: form.value.director || null,
      country: form.value.country || null,
      language: form.value.language || null,
      cast: form.value.cast || null,
      trailerUrl: form.value.trailerUrl || null,
      rating: form.value.rating === '' || form.value.rating == null ? null : Number(form.value.rating),
    }

    await apiFetch(path, {
      method,
      body: JSON.stringify(body),
    })

    await fetchList()
    closeModal()
    toast.success(isEdit ? 'Cập nhật phim thành công' : 'Thêm phim thành công')
  } catch (e) {
    formError.value = e.message
    toast.error('Lỗi: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function remove(movie) {
  if (!confirm(`Xóa phim "${movie.title}"?`)) return
  try {
    await apiFetch(`/api/admin/movies/${movie.id}`, { method: 'DELETE' })
    await fetchList()
    toast.success(`Đã xóa phim "${movie.title}"`)
  } catch (e) {
    toast.error('Không thể xóa: ' + e.message)
  }
}

function formatDuration(mins) {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}p` : `${m}p`
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Quản lý phim</h2>
        <p class="page-sub">{{ list.length }} phim trong hệ thống</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <AppIcon name="plus" :size="18" />
        <span>Thêm phim</span>
      </button>
    </div>

    <div class="toolbar">
      <div class="search-wrap">
        <AppIcon name="search" :size="16" class="search-icon" />
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Tìm phim theo tên..."
        />
      </div>
    </div>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="filtered.length === 0" class="state">Chưa có phim nào.</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:60px">ID</th>
            <th style="width:80px">Poster</th>
            <th>Tên phim</th>
            <th style="width:110px">Thời lượng</th>
            <th style="width:160px">Thể loại</th>
            <th style="width:130px">Khởi chiếu</th>
            <th style="width:130px">Trạng thái</th>
            <th style="width:120px">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in pageItems" :key="m.id">
            <td class="cell-id">#{{ m.id }}</td>
            <td>
              <img
                v-if="m.posterUrl"
                :src="m.posterUrl"
                :alt="m.title"
                class="row-poster"
                @error="(e) => e.target.style.display = 'none'"
              />
              <div v-else class="row-poster-fallback">
                <AppIcon name="movie" :size="20" />
              </div>
            </td>
            <td>
              <div class="cell-title">{{ m.title }}</div>
              <div v-if="m.director" class="cell-sub">ĐD: {{ m.director }}</div>
            </td>
            <td>{{ formatDuration(m.duration) }}</td>
            <td>
              <span v-if="m.genre" class="genre-tag">{{ m.genre }}</span>
              <span v-else class="cell-muted">—</span>
            </td>
            <td>
              <span v-if="m.releaseDate">
                {{ new Date(m.releaseDate).toLocaleDateString('vi-VN') }}
              </span>
              <span v-else class="cell-muted">—</span>
            </td>
            <td>
              <span class="badge" :class="m.isActive ? 'active' : 'inactive'">
                {{ m.isActive ? 'Đang chiếu' : 'Ngừng chiếu' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="btn-icon" @click="openEdit(m)" title="Sửa">
                  <AppIcon name="edit" :size="16" />
                </button>
                <button class="btn-icon danger" @click="remove(m)" title="Xóa">
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
          <h3>{{ editing ? 'Sửa phim' : 'Thêm phim mới' }}</h3>
          <button class="modal-close" @click="closeModal">
            <AppIcon name="x" :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <div class="form-row">
            <label>Tên phim <span class="required">*</span></label>
            <input v-model="form.title" type="text" placeholder="Ví dụ: Avatar" />
          </div>

          <div class="form-row-2">
            <div class="form-row">
              <label>Thời lượng (phút) <span class="required">*</span></label>
              <input v-model.number="form.duration" type="number" min="1" />
            </div>
            <div class="form-row">
              <label>Ngày khởi chiếu</label>
              <input v-model="form.releaseDate" type="date" />
            </div>
          </div>

          <div class="form-row">
            <label>Thể loại</label>
            <input v-model="form.genre" type="text" placeholder="Hành động, Viễn tưởng" />
          </div>

          <div class="form-row">
            <label>Đạo diễn</label>
            <input v-model="form.director" type="text" placeholder="James Cameron" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Quốc gia</label>
              <input v-model="form.country" type="text" placeholder="Hàn Quốc" />
            </div>
            <div class="form-row">
              <label>Ngôn ngữ / phụ đề</label>
              <input v-model="form.language" type="text" placeholder="Tiếng Hàn - Phụ đề Việt" />
            </div>
          </div>
          <div class="form-row">
            <label>Diễn viên</label>
            <input v-model="form.cast" type="text" placeholder="Song Kang-ho, Choi Woo-shik" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Link trailer YouTube</label>
              <input v-model="form.trailerUrl" type="text" placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div class="form-row">
              <label>Điểm</label>
              <input v-model="form.rating" type="number" min="0" max="10" step="0.1" />
            </div>
          </div>

          <ImageField v-model="form.posterUrl" label="Poster" />

          <div class="form-row">
            <label>Mô tả</label>
            <textarea v-model="form.description" rows="3" placeholder="Nội dung phim..."></textarea>
          </div>

          <div class="form-row">
            <label class="checkbox-label">
              <input v-model="form.isActive" type="checkbox" />
              <span>Phim đang chiếu</span>
            </label>
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
/* ... CSS giữ nguyên như trước ... */
.page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}
.page-sub { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0 0; }
.toolbar { display: flex; gap: 0.75rem; }
.search-wrap { flex: 1; position: relative; max-width: 400px; }
.search-icon {
  position: absolute; left: 0.85rem; top: 50%;
  transform: translateY(-50%); color: var(--text-muted); pointer-events: none;
}
.search-input {
  width: 100%; padding: 0.7rem 1rem 0.7rem 2.5rem;
  border-radius: var(--radius-md); border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.3); color: var(--text-primary);
  font-size: 0.9rem; font-family: inherit;
}
.search-input:focus { outline: none; border-color: var(--accent-red); }
.search-input::placeholder { color: var(--text-dim); }
.state { padding: 3rem; text-align: center; color: var(--text-muted); }
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px; margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent-red);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.table-wrap {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); overflow: hidden;
}
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table thead { background: rgba(255, 255, 255, 0.03); }
.data-table th {
  text-align: left; padding: 0.9rem 1rem; font-size: 0.72rem;
  font-weight: 700; color: var(--text-muted); text-transform: uppercase;
  letter-spacing: 0.06em; border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
}
.data-table td {
  padding: 0.9rem 1rem; color: var(--text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03); vertical-align: middle;
}
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
.cell-id { color: var(--accent-gold); font-weight: 700; font-family: monospace; }
.cell-title { color: var(--text-primary); font-weight: 600; font-size: 0.9rem; }
.cell-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; }
.cell-muted { color: var(--text-dim); }
.row-poster { width: 40px; height: 56px; border-radius: 6px; object-fit: cover; display: block; }
.row-poster-fallback {
  width: 40px; height: 56px; border-radius: 6px;
  background: linear-gradient(145deg, #1e293b, #0f172a);
  display: flex; align-items: center; justify-content: center; color: var(--text-muted);
}
.genre-tag {
  display: inline-block; padding: 0.2rem 0.55rem;
  background: rgba(59, 130, 246, 0.12); color: #93c5fd;
  border-radius: 6px; font-size: 0.75rem; font-weight: 600;
}
.badge {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.7rem; border-radius: 999px;
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge::before {
  content: ''; width: 6px; height: 6px;
  border-radius: 50%; background: currentColor;
}
.badge.active { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.badge.inactive { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
.actions { display: flex; gap: 0.4rem; }
.btn-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-subtle);
  color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.btn-icon:hover { background: rgba(255, 255, 255, 0.1); color: var(--text-primary); }
.btn-icon.danger:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.4); color: #f87171;
}
.btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.65rem 1.25rem; border-radius: var(--radius-md);
  font-weight: 700; font-size: 0.9rem; cursor: pointer;
  border: none; transition: all 0.2s; font-family: inherit;
  white-space: nowrap;
}
.btn-primary {
  background: var(--accent-red); color: #fff; box-shadow: var(--shadow-glow-red);
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-red-hover); transform: translateY(-1px);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: rgba(255, 255, 255, 0.06); color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}
.btn-secondary:hover { background: rgba(255, 255, 255, 0.12); color: var(--text-primary); }
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
  z-index: 200; display: flex; align-items: center; justify-content: center;
  padding: 1.5rem; backdrop-filter: blur(4px);
}
.modal {
  width: 100%; max-width: 560px; max-height: 90vh;
  background: #141414; border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden;
}
.modal-head {
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-subtle);
  display: flex; justify-content: space-between; align-items: center;
}
.modal-head h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
.modal-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; background: transparent; border: none;
  color: var(--text-muted); cursor: pointer; border-radius: 6px; transition: all 0.15s;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.08); color: var(--text-primary); }
.modal-body {
  padding: 1.5rem; overflow-y: auto;
  display: flex; flex-direction: column; gap: 1rem;
}
.form-row { display: flex; flex-direction: column; gap: 0.45rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-row label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
.required { color: #f87171; }
.form-row input,
.form-row textarea {
  padding: 0.7rem 0.9rem; border-radius: var(--radius-md);
  border: 1px solid var(--border-strong); background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary); font-size: 0.9rem; font-family: inherit;
  resize: vertical; transition: border-color 0.2s;
}
.form-row input:focus,
.form-row textarea:focus {
  outline: none; border-color: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
}
.checkbox-label {
  display: flex; flex-direction: row; align-items: center; gap: 0.5rem;
  cursor: pointer; user-select: none;
}
.checkbox-label input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent-red); }
.form-error {
  color: #fca5a5; font-size: 0.85rem; padding: 0.7rem 0.9rem;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-sm); margin: 0;
}
.modal-foot {
  padding: 1rem 1.5rem; border-top: 1px solid var(--border-subtle);
  display: flex; justify-content: flex-end; gap: 0.75rem;
}
@media (max-width: 640px) {
  .form-row-2 { grid-template-columns: 1fr; }
}
</style>