<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import AdminPager from '../../components/AdminPager.vue'
import ImageField from '../../components/ImageField.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'

const toast = useToast()
const pages = [
  { id: 'news', name: 'Tin tức', metaLabel: 'Ngày' },
  { id: 'promotion', name: 'Khuyến mãi', metaLabel: 'Nhãn' },
  { id: 'price', name: 'Giá vé', metaLabel: 'Kênh' },
  { id: 'festival', name: 'Liên hoan phim', metaLabel: 'Thời gian' },
  { id: 'about', name: 'Giới thiệu', metaLabel: 'Nhãn' },
]

const articles = ref([])
const loading = ref(true)
const error = ref('')
const current = ref('news')
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  page: current.value,
  slot: 'card',
  title: '',
  meta: '',
  body: '',
  extra: '',
  imageUrl: '',
  sortOrder: 1,
  isActive: true,
})

const form = ref(emptyForm())
const pageMeta = computed(() => pages.find((page) => page.id === current.value))
const cardImages = {
  'National Cinema mở thêm suất cuối tuần': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
  'Vé điện tử có mã QR check-in': 'https://images.unsplash.com/photo-1517604931442-0a0dd4d0e1a3?auto=format&fit=crop&w=900&q=80',
  'Ghế đôi đã có trên sơ đồ phòng': 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=80',
  'Đồng giá vé 75.000đ': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
  'Combo bắp nước 79.000đ': 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=900&q=80',
  'Suất ngày thường tại quầy': 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80',
  'Tuần phim cuối tháng': 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=900&q=80',
  'Tuần phim hoạt hình': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80',
  'Suất đặc biệt tại rạp': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=900&q=80',
  'Đặt vé online': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
  'Quầy vé': 'https://images.unsplash.com/photo-1517604931442-0a0dd4d0e1a3?auto=format&fit=crop&w=900&q=80',
  'Liên hệ': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80',
  'Giữ ghế': 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=80',
  'Số ghế mỗi đơn': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
}

function photo(item) {
  return item?.imageUrl || cardImages[item?.title] || ''
}
const ofPage = computed(() => articles.value.filter((item) => item.page === current.value))
const intro = computed(() => ofPage.value.find((item) => item.slot === 'intro') || null)
const rows = computed(() => ofPage.value.filter((item) => item.slot === 'row'))
const cards = computed(() => ofPage.value.filter((item) => item.slot === 'card'))
const rowPage = usePager(rows)
const cardPage = usePager(cards)

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    articles.value = (await apiFetch('/api/admin/site-articles')) ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate(slot) {
  editing.value = null
  const list = slot === 'row' ? rows.value : slot === 'card' ? cards.value : ofPage.value
  form.value = { ...emptyForm(), slot, title: slot === 'intro' ? 'Mở đầu' : '', sortOrder: list.length + 1 }
  formError.value = ''
  showModal.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    page: item.page,
    slot: item.slot,
    title: item.title || '',
    meta: item.meta || '',
    body: item.body || '',
    extra: item.extra || '',
    imageUrl: photo(item),
    sortOrder: item.sortOrder ?? 1,
    isActive: item.isActive,
  }
  formError.value = ''
  showModal.value = true
}

function payload() {
  return {
    page: form.value.page,
    slot: form.value.slot,
    title: form.value.title.trim(),
    meta: form.value.meta.trim(),
    body: form.value.body.trim(),
    extra: form.value.extra.trim(),
    imageUrl: form.value.imageUrl.trim(),
    sortOrder: Number(form.value.sortOrder) || 0,
    isActive: form.value.isActive,
  }
}

async function save() {
  formError.value = ''
  if (form.value.slot === 'intro' && !form.value.body.trim()) {
    formError.value = 'Nhập đoạn mở đầu'
    return
  }
  if (form.value.slot !== 'intro' && !form.value.title.trim()) {
    formError.value = 'Nhập tiêu đề'
    return
  }
  saving.value = true
  try {
    const path = editing.value
      ? `/api/admin/site-articles/${editing.value.id}`
      : '/api/admin/site-articles'
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

async function remove(item) {
  if (!confirm(`Xóa "${item.title}"?`)) return
  try {
    await apiFetch(`/api/admin/site-articles/${item.id}`, { method: 'DELETE' })
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
        <h2 class="page-title">Nội dung trang</h2>
        <p class="page-sub">Sửa Tin tức, Khuyến mãi, Giá vé, Liên hoan phim và Giới thiệu trên menu khách.</p>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="page in pages"
        :key="page.id"
        type="button"
        class="tab"
        :class="{ active: current === page.id }"
        @click="current = page.id"
      >
        {{ page.name }}
      </button>
    </div>

    <p v-if="current === 'price'" class="note">
      Bảng này chỉ là nội dung khách đọc. Giá vé online khi đặt vẫn là 75.000đ mỗi ghế.
    </p>

    <p v-if="loading" class="state">Đang tải...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else>
      <section class="block">
        <div class="block-head">
          <h3>Đoạn mở đầu</h3>
          <button v-if="!intro" class="btn btn-primary" type="button" @click="openCreate('intro')">
            <AppIcon name="plus" :size="16" /> Thêm
          </button>
        </div>
        <article v-if="intro" class="card">
          <div>
            <p>{{ intro.body }}</p>
            <span class="meta">{{ intro.isActive ? 'Đang hiện' : 'Đang ẩn' }}</span>
          </div>
          <div class="actions">
            <button class="btn" type="button" @click="openEdit(intro)">Sửa</button>
            <button class="btn danger" type="button" @click="remove(intro)">Xóa</button>
          </div>
        </article>
        <p v-else class="state">Chưa có đoạn mở đầu.</p>
      </section>

      <section v-if="current === 'price'" class="block">
        <div class="block-head">
          <h3>Bảng giá</h3>
          <button class="btn btn-primary" type="button" @click="openCreate('row')">
            <AppIcon name="plus" :size="16" /> Thêm dòng
          </button>
        </div>
        <p v-if="!rows.length" class="state">Chưa có dòng giá.</p>
        <article v-for="item in rowPage.items.value" :key="item.id" class="card">
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.meta }} · {{ item.extra }}</p>
            <span class="meta">{{ item.isActive ? 'Đang hiện' : 'Đang ẩn' }} · thứ tự {{ item.sortOrder }}</span>
          </div>
          <div class="actions">
            <button class="btn" type="button" @click="openEdit(item)">Sửa</button>
            <button class="btn danger" type="button" @click="remove(item)">Xóa</button>
          </div>
        </article>
        <AdminPager v-model:page="rowPage.page.value" :page-count="rowPage.pageCount.value" :total="rowPage.total.value" />
      </section>

      <section class="block">
        <div class="block-head">
          <h3>{{ current === 'price' ? 'Ghi chú' : 'Bài viết' }}</h3>
          <button class="btn btn-primary" type="button" @click="openCreate('card')">
            <AppIcon name="plus" :size="16" /> Thêm
          </button>
        </div>
        <p v-if="!cards.length" class="state">Chưa có bài.</p>
        <article v-for="item in cardPage.items.value" :key="item.id" class="card">
          <img v-if="photo(item)" class="thumb" :src="photo(item)" :alt="item.title" />
          <div class="copy">
            <strong>{{ item.title }}</strong>
            <p>{{ item.body }}</p>
            <span class="meta">
              <template v-if="item.meta">{{ item.meta }} · </template>
              {{ item.isActive ? 'Đang hiện' : 'Đang ẩn' }} · thứ tự {{ item.sortOrder }}
            </span>
          </div>
          <div class="actions">
            <button class="btn" type="button" @click="openEdit(item)">Sửa</button>
            <button class="btn danger" type="button" @click="remove(item)">Xóa</button>
          </div>
        </article>
        <AdminPager v-model:page="cardPage.page.value" :page-count="cardPage.pageCount.value" :total="cardPage.total.value" />
      </section>
    </template>

    <Teleport to="body">
      <div v-if="showModal" class="modal-back" @click.self="showModal = false">
        <form class="modal" @submit.prevent="save">
          <div class="modal-head">
            <h3>{{ editing ? 'Sửa nội dung' : 'Thêm nội dung' }}</h3>
            <button type="button" class="close" @click="showModal = false">✕</button>
          </div>
          <label v-if="form.slot !== 'intro'">
            Tiêu đề
            <input v-model="form.title" required />
          </label>
          <label v-if="form.slot === 'card' && current !== 'about'">
            {{ pageMeta?.metaLabel }}
            <input v-model="form.meta" />
          </label>
          <label v-if="form.slot === 'row'">
            Kênh
            <input v-model="form.meta" />
          </label>
          <label v-if="form.slot === 'row'">
            Giá hiển thị
            <input v-model="form.extra" placeholder="75.000đ / ghế" />
          </label>
          <ImageField v-if="form.slot === 'card'" v-model="form.imageUrl" label="Ảnh minh họa" />
          <label v-if="form.slot !== 'row'">
            {{ form.slot === 'intro' ? 'Đoạn mở đầu' : 'Nội dung' }}
            <textarea v-model="form.body" rows="4" />
          </label>
          <div class="split">
            <label>
              Thứ tự
              <input v-model.number="form.sortOrder" type="number" min="0" />
            </label>
            <label class="check">
              <input v-model="form.isActive" type="checkbox" />
              Đang hiện
            </label>
          </div>
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <div class="modal-foot">
            <button type="button" class="btn" @click="showModal = false">Hủy</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Đang lưu...' : 'Lưu' }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-title { margin: 0 0 0.3rem; }
.page-sub, .state, .note { color: var(--text-muted); }
.note {
  margin: 0.9rem 0 0;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}
.state.error, .form-error { color: #fca5a5; }
.tabs { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
.tab {
  border: 1px solid var(--border-strong);
  background: #141414;
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-family: inherit;
}
.tab.active { background: var(--accent-red); border-color: var(--accent-red); color: #fff; }
.block { margin-top: 1.25rem; }
.block-head, .card, .modal-foot, .split {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.block-head h3 { margin: 0; }
.card {
  margin-top: 0.75rem;
  padding: 1rem 1.1rem;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}
.card p { margin: 0.25rem 0; color: var(--text-secondary); }
.thumb {
  width: 112px;
  height: 84px;
  object-fit: cover;
  border-radius: 10px;
  flex-shrink: 0;
}
.copy { flex: 1; min-width: 0; }
.meta { color: var(--text-muted); font-size: 0.82rem; }
.actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: #fff;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-primary { background: var(--accent-red); border-color: var(--accent-red); }
.danger { color: #fca5a5; }
.modal-back {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: grid;
  place-items: center;
  z-index: 400;
  padding: 1rem;
}
.modal {
  width: min(560px, 100%);
  padding: 1.15rem 1.2rem 1.2rem;
  display: grid;
  gap: 0.75rem;
  max-height: calc(100vh - 2rem);
  overflow: auto;
  background: #141414;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}
.modal-head { display: flex; justify-content: space-between; align-items: center; }
.modal h3 { margin: 0; }
.close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
}
.modal label { display: grid; gap: 0.35rem; color: #cbd5e1; font-size: 0.85rem; }
.modal input, .modal textarea {
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #0b0b0b;
  color: #fff;
  font-family: inherit;
}
.split { align-items: end; }
.check { display: flex !important; align-items: center; gap: 0.45rem; margin-bottom: 0.7rem; }
.modal-foot { justify-content: flex-end; }
</style>
