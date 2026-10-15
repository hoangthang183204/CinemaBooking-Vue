<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import ImageField from '../../components/ImageField.vue'
import AdminPager from '../../components/AdminPager.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'

const toast = useToast()
const blocks = ref([])
const movies = ref([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  kind: 'hero',
  title: '',
  subtitle: '',
  tag: '',
  dateLabel: '',
  imageUrl: '',
  accentColor: '#e63946',
  movieId: '',
  sortOrder: 1,
  isActive: true,
})

const form = ref(emptyForm())

const heroes = computed(() => blocks.value.filter((b) => b.kind === 'hero'))
const snacks = computed(() => blocks.value.filter((b) => b.kind === 'snack'))
const heroPage = usePager(heroes)
const snackPage = usePager(snacks)

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    const [list, movieList] = await Promise.all([
      apiFetch('/api/admin/home-blocks'),
      apiFetch('/api/admin/movies'),
    ])
    blocks.value = list ?? []
    movies.value = movieList ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate(kind) {
  editing.value = null
  form.value = { ...emptyForm(), kind, sortOrder: (kind === 'hero' ? heroes.value.length : snacks.value.length) + 1 }
  formError.value = ''
  showModal.value = true
}

function openEdit(block) {
  editing.value = block
  form.value = {
    kind: block.kind,
    title: block.title || '',
    subtitle: block.subtitle || '',
    tag: block.tag || '',
    dateLabel: block.dateLabel || '',
    imageUrl: block.imageUrl || '',
    accentColor: block.accentColor || '#e63946',
    movieId: block.movieId || '',
    sortOrder: block.sortOrder ?? 1,
    isActive: block.isActive,
  }
  formError.value = ''
  showModal.value = true
}

function payload() {
  return {
    kind: form.value.kind,
    title: form.value.title.trim(),
    subtitle: form.value.subtitle.trim(),
    tag: form.value.tag.trim(),
    dateLabel: form.value.dateLabel.trim(),
    imageUrl: form.value.imageUrl.trim(),
    accentColor: form.value.accentColor,
    movieId: form.value.movieId ? Number(form.value.movieId) : null,
    sortOrder: Number(form.value.sortOrder) || 0,
    isActive: form.value.isActive,
  }
}

async function save() {
  formError.value = ''
  if (!form.value.title.trim()) {
    formError.value = 'Nhập tiêu đề'
    return
  }
  saving.value = true
  try {
    const path = editing.value
      ? `/api/admin/home-blocks/${editing.value.id}`
      : '/api/admin/home-blocks'
    await apiFetch(path, {
      method: editing.value ? 'PUT' : 'POST',
      body: JSON.stringify(payload()),
    })
    showModal.value = false
    await fetchAll()
    toast.success(editing.value ? 'Đã cập nhật' : 'Đã thêm')
  } catch (e) {
    formError.value = e.message
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}

async function remove(block) {
  if (!confirm(`Xóa "${block.title}"?`)) return
  try {
    await apiFetch(`/api/admin/home-blocks/${block.id}`, { method: 'DELETE' })
    await fetchAll()
    toast.success('Đã xóa')
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
        <h2 class="page-title">Banner và bắp nước</h2>
        <p class="page-sub">Nội dung này hiện trên trang chủ của khách.</p>
      </div>
    </div>

    <p v-if="loading" class="state">Đang tải...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else>
      <section class="block">
        <div class="block-head">
          <h3>Banner</h3>
          <button class="btn btn-primary" @click="openCreate('hero')">
            <AppIcon name="plus" :size="16" /> Thêm banner
          </button>
        </div>
        <p v-if="!heroes.length" class="state">Chưa có banner.</p>
        <article v-for="item in heroPage.items.value" :key="item.id" class="card">
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.subtitle }}</p>
            <span class="meta">{{ item.isActive ? 'Đang hiện' : 'Đang ẩn' }} · thứ tự {{ item.sortOrder }}</span>
          </div>
          <div class="actions">
            <button class="btn" @click="openEdit(item)">Sửa</button>
            <button class="btn danger" @click="remove(item)">Xóa</button>
          </div>
        </article>
        <AdminPager v-model:page="heroPage.page.value" :page-count="heroPage.pageCount.value" :total="heroPage.total.value" />
      </section>

      <section class="block">
        <div class="block-head">
          <h3>Bắp nước</h3>
          <button class="btn btn-primary" @click="openCreate('snack')">
            <AppIcon name="plus" :size="16" /> Thêm món
          </button>
        </div>
        <p v-if="!snacks.length" class="state">Chưa có món.</p>
        <article v-for="item in snackPage.items.value" :key="item.id" class="card">
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.subtitle }}</p>
            <span class="meta">{{ item.isActive ? 'Đang hiện' : 'Đang ẩn' }} · thứ tự {{ item.sortOrder }}</span>
          </div>
          <div class="actions">
            <button class="btn" @click="openEdit(item)">Sửa</button>
            <button class="btn danger" @click="remove(item)">Xóa</button>
          </div>
        </article>
        <AdminPager v-model:page="snackPage.page.value" :page-count="snackPage.pageCount.value" :total="snackPage.total.value" />
      </section>
    </template>

    <div v-if="showModal" class="modal-back" @click.self="showModal = false">
      <form class="modal" @submit.prevent="save">
        <h3>{{ editing ? 'Sửa nội dung' : 'Thêm nội dung' }}</h3>
        <label>
          Loại
          <select v-model="form.kind">
            <option value="hero">Banner</option>
            <option value="snack">Bắp nước</option>
          </select>
        </label>
        <label>
          Tiêu đề
          <input v-model="form.title" required />
        </label>
        <label>
          Dòng phụ
          <input v-model="form.subtitle" />
        </label>
        <template v-if="form.kind === 'hero'">
          <label>
            Dòng nhỏ phía trên
            <input v-model="form.tag" />
          </label>
          <label>
            Ngày khởi chiếu
            <input v-model="form.dateLabel" placeholder="25.09.2026" />
          </label>
          <ImageField v-model="form.imageUrl" label="Ảnh banner" />
          <label>
            Phim khi bấm Đặt vé
            <select v-model="form.movieId">
              <option value="">Phim đầu danh sách</option>
              <option v-for="movie in movies" :key="movie.id" :value="movie.id">
                {{ movie.title }}
              </option>
            </select>
          </label>
        </template>
        <label v-else>
          Màu
          <input v-model="form.accentColor" type="color" />
        </label>
        <label>
          Thứ tự
          <input v-model.number="form.sortOrder" type="number" min="0" />
        </label>
        <label class="check">
          <input v-model="form.isActive" type="checkbox" />
          Hiện trên trang chủ
        </label>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="modal-foot">
          <button type="button" class="btn" @click="showModal = false">Hủy</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Đang lưu...' : 'Lưu' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page-title { margin: 0 0 0.3rem; }
.page-sub, .state { color: var(--text-muted); }
.state.error, .form-error { color: #fca5a5; }
.block { margin-top: 1.5rem; }
.block-head, .card, .modal-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.block-head h3 { margin: 0; }
.card, .modal {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}
.card { margin-top: 0.75rem; padding: 1rem 1.1rem; }
.card p { margin: 0.25rem 0; color: var(--text-secondary); }
.meta { color: var(--text-muted); font-size: 0.82rem; }
.actions { display: flex; gap: 0.5rem; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border-strong);
  background: transparent;
  color: #fff;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
}
.btn-primary { background: var(--accent-red); border-color: var(--accent-red); }
.danger { color: #fca5a5; }
.modal-back {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: grid;
  place-items: center;
  z-index: 30;
  padding: 1rem;
}
.modal {
  width: min(520px, 100%);
  padding: 1.2rem;
  display: grid;
  gap: 0.75rem;
  max-height: calc(100vh - 2rem);
  overflow: auto;
}
.modal h3 { margin: 0; }
.modal label { display: grid; gap: 0.35rem; color: var(--text-secondary); font-size: 0.85rem; }
.modal input, .modal select {
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: #0b0b0b;
  color: #fff;
}
.modal input[type='color'] { padding: 0.2rem; height: 42px; }
.check { display: flex !important; align-items: center; }
.modal-foot { justify-content: flex-end; }
</style>
