<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AdminPager from '../../components/AdminPager.vue'
import ImageField from '../../components/ImageField.vue'
import { usePager } from '../../composables/usePager'
import { useToast } from '../../composables/useToast'
import { apiFetch } from '../../api'

const toast = useToast()
const positions = [
  { id: 'Admin', label: 'Admin' },
  { id: 'ShiftManager', label: 'Quản lý ca' },
  { id: 'TicketSeller', label: 'Nhân viên bán vé' },
  { id: 'TicketChecker', label: 'Nhân viên soát vé' },
]

const list = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const selected = ref(null)
const detailLoading = ref(false)
const editor = ref(null)
const saving = ref(false)
const now = ref(Date.now())
let clockTimer = 0
let pollTimer = 0

const onDuty = computed(() => list.value.filter((person) => person.onDuty))
const handingOver = computed(() => list.value.filter((person) => person.handoverPending && !person.onDuty))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return list.value
  return list.value.filter((person) =>
    [person.fullName, person.email, person.phone, person.citizenId, String(person.id)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  )
})
const { page, pageCount, total, items: pageItems } = usePager(filtered)

const SHIFT_PAGE = 6
const shiftPage = ref(1)
const shiftTotal = computed(() => selected.value?.shifts?.length || 0)
const shiftPageCount = computed(() => Math.max(1, Math.ceil(shiftTotal.value / SHIFT_PAGE)))
const shiftItems = computed(() => {
  const start = (shiftPage.value - 1) * SHIFT_PAGE
  return (selected.value?.shifts || []).slice(start, start + SHIFT_PAGE)
})
const dayRevenue = computed(() => {
  const best = new Map()
  for (const shift of selected.value?.shifts || []) {
    const key = dayKey(shift.endedAt || shift.startedAt)
    const amount = Number(shift.expectedCash || 0) + Number(shift.expectedTransfer || 0)
    if (!best.has(key) || amount > best.get(key)) best.set(key, amount)
  }
  let sum = 0
  for (const amount of best.values()) sum += amount
  return sum
})

watch(() => selected.value?.id, () => {
  shiftPage.value = 1
})
watch(shiftPageCount, (count) => {
  if (shiftPage.value > count) shiftPage.value = count
})

function positionLabel(code) {
  return positions.find((item) => item.id === code)?.label || 'Nhân viên'
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  const letters = (parts.length > 1 ? parts.slice(-2) : parts).map((part) => part[0])
  return letters.join('').toUpperCase() || '?'
}

function hue(id) {
  return (Number(id) * 47) % 360
}

function money(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')}₫`
}

function parseTime(value) {
  if (!value) return null
  const raw = String(value)
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
  const date = new Date(hasZone ? raw : `${raw}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayKey(value) {
  const date = parseTime(value)
  if (!date) return 'open'
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function when(value) {
  const date = parseTime(value)
  return date ? date.toLocaleString('vi-VN') : '—'
}

function elapsed(startedAt) {
  const date = parseTime(startedAt)
  if (!date) return '00:00:00'
  const seconds = Math.max(0, Math.floor((now.value - date.getTime()) / 1000))
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
}
function statusLabel(status) {
  if (status === 'Open') return 'Đang mở'
  if (status === 'Handover') return 'Chờ bàn giao'
  if (status === 'Approved') return 'Đã duyệt'
  return 'Đã đóng'
}

async function refreshQuiet() {
  try {
    const rows = (await apiFetch('/api/admin/staff')) ?? []
    list.value = rows
    if (!selected.value?.id) return
    const fresh = rows.find((person) => person.id === selected.value.id)
    if (!fresh) return
    const dutyChanged = fresh.onDuty !== selected.value.onDuty
      || fresh.handoverPending !== selected.value.handoverPending
      || fresh.dutyStartedAt !== selected.value.dutyStartedAt
    if (dutyChanged) selected.value = await apiFetch(`/api/admin/staff/${selected.value.id}`)
    else selected.value = { ...selected.value, onDuty: fresh.onDuty, handoverPending: fresh.handoverPending, dutyStartedAt: fresh.dutyStartedAt }
  } catch {
    /* Giữ danh sách đang hiện khi lần làm mới bị lỗi. */
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = (await apiFetch('/api/admin/staff')) ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function openDetail(person) {
  detailLoading.value = true
  selected.value = person
  try {
    selected.value = await apiFetch(`/api/admin/staff/${person.id}`)
  } catch (e) {
    toast.error(e.message)
  } finally {
    detailLoading.value = false
  }
}

function blankForm() {
  return {
    id: 0,
    fullName: '',
    email: '',
    phone: '',
    citizenId: '',
    avatarUrl: '',
    position: 'TicketSeller',
    password: '',
    isActive: true,
  }
}

function openCreate() {
  editor.value = blankForm()
}

function openEdit(person) {
  editor.value = {
    id: person.id,
    fullName: person.fullName,
    email: person.email,
    phone: person.phone || '',
    citizenId: person.citizenId || '',
    avatarUrl: person.avatarUrl || '',
    position: person.position || 'TicketSeller',
    password: '',
    isActive: person.isActive,
  }
}

async function save() {
  saving.value = true
  const form = editor.value
  const body = {
    fullName: form.fullName,
    email: form.email,
    phone: form.phone || null,
    citizenId: form.citizenId || null,
    avatarUrl: form.avatarUrl || null,
    position: form.position,
    password: form.password || null,
    isActive: form.isActive,
  }
  try {
    const path = form.id ? `/api/admin/staff/${form.id}` : '/api/admin/staff'
    const saved = await apiFetch(path, { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(body) })
    toast.success(form.id ? 'Đã cập nhật nhân viên' : `Đã tạo nhân viên, mã ${saved.id}`)
    editor.value = null
    await load()
    if (selected.value?.id === saved.id || !form.id) selected.value = saved
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshQuiet()
  }, 8000)
})
onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
  window.clearInterval(pollTimer)
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Quản lý nhân viên</h2>
        <p class="page-sub">Bấm một người để xem hồ sơ. Danh sách và lịch sử ca nằm trong khung, không kéo dài cả trang.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openCreate">Thêm nhân viên</button>
    </div>

    <div class="live">
      <span class="live-dot"></span>
      <strong>Ca hiện tại</strong>
      <span v-if="!onDuty.length && !handingOver.length" class="live-empty">Không có ai đang mở ca.</span>
      <button v-for="person in onDuty" :key="'on-' + person.id" class="duty-chip" type="button" @click="openDetail(person)">
        <span>{{ person.fullName }}</span>
        <small>{{ elapsed(person.dutyStartedAt) }}</small>
      </button>
      <button v-for="person in handingOver" :key="'wait-' + person.id" class="duty-chip wait" type="button" @click="openDetail(person)">
        <span>{{ person.fullName }}</span>
        <small>Chờ bàn giao</small>
      </button>
    </div>

    <p v-if="loading" class="state">Đang tải...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <div v-else class="workspace">
      <section class="pane">
        <input v-model="search" class="search" type="search" placeholder="Tìm tên, email, điện thoại, CCCD, mã" />
        <p v-if="!filtered.length" class="state">Chưa có nhân viên.</p>
        <div v-else class="pane-scroll">
          <div class="cards">
          <button
            v-for="person in pageItems"
            :key="person.id"
            type="button"
            class="card"
            :class="{ active: selected?.id === person.id, off: !person.isActive }"
            @click="openDetail(person)"
          >
            <span class="avatar" :style="person.avatarUrl ? {} : { background: `hsl(${hue(person.id)} 42% 32%)` }">
              <img v-if="person.avatarUrl" :src="person.avatarUrl" :alt="person.fullName" />
              <template v-else>{{ initials(person.fullName) }}</template>
              <i v-if="person.onDuty" class="duty-dot"></i>
              <i v-else-if="person.handoverPending" class="duty-dot wait"></i>
            </span>
            <span class="who">
              <strong>{{ person.fullName }}</strong>
              <small>Mã {{ person.id }} · {{ positionLabel(person.position) }}</small>
            </span>
            <span class="pill" :class="person.isActive ? 'on' : 'off'">{{ person.isActive ? 'Đang làm việc' : 'Đã nghỉ việc' }}</span>
          </button>
          </div>
        </div>
        <AdminPager v-model:page="page" :page-count="pageCount" :total="total" />
      </section>

      <aside v-if="selected" class="pane detail">
        <p v-if="detailLoading" class="state">Đang tải hồ sơ...</p>
        <template v-else>
          <div class="detail-head">
            <span class="avatar lg" :style="selected.avatarUrl ? {} : { background: `hsl(${hue(selected.id)} 42% 32%)` }">
              <img v-if="selected.avatarUrl" :src="selected.avatarUrl" :alt="selected.fullName" />
              <template v-else>{{ initials(selected.fullName) }}</template>
            </span>
            <div>
              <h3>{{ selected.fullName }}</h3>
              <p>Mã nhân viên {{ selected.id }} · {{ positionLabel(selected.position) }}</p>
            </div>
            <button class="btn" type="button" @click="openEdit(selected)">Sửa</button>
          </div>
          <dl class="facts">
            <div><dt>Điện thoại</dt><dd>{{ selected.phone || '—' }}</dd></div>
            <div><dt>CCCD</dt><dd>{{ selected.citizenId || '—' }}</dd></div>
            <div><dt>Email</dt><dd>{{ selected.email }}</dd></div>
            <div><dt>Trạng thái</dt><dd>{{ selected.isActive ? 'Đang làm việc' : 'Đã nghỉ việc' }}</dd></div>
            <div><dt>Ca hiện tại</dt><dd>{{ selected.onDuty ? `Đang trực ${elapsed(selected.dutyStartedAt)}` : selected.handoverPending ? 'Chờ bàn giao' : 'Không trực' }}</dd></div>
            <div><dt>Số ca</dt><dd>{{ selected.shiftCount }}</dd></div>
            <div><dt>Doanh thu theo ngày</dt><dd>{{ money(dayRevenue) }}</dd></div>
          </dl>
          <div class="shift-head">
            <h4>Lịch sử ca trực</h4>
            <span v-if="shiftTotal">{{ shiftTotal }} ca · trang {{ shiftPage }}/{{ shiftPageCount }}</span>
          </div>
          <p v-if="!shiftTotal" class="state">Chưa có ca nào.</p>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr><th>Ca</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th><th>Tiền mặt</th><th>Chuyển khoản</th></tr>
              </thead>
              <tbody>
                <tr v-for="shift in shiftItems" :key="shift.id">
                  <td>#{{ shift.id }}</td>
                  <td>{{ when(shift.startedAt) }}</td>
                  <td>{{ shift.endedAt ? when(shift.endedAt) : 'Đang làm' }}</td>
                  <td>{{ statusLabel(shift.status) }}</td>
                  <td>{{ money(shift.expectedCash) }}</td>
                  <td>{{ money(shift.expectedTransfer) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="shiftPageCount > 1" class="shift-pager">
            <button class="btn" type="button" :disabled="shiftPage <= 1" @click="shiftPage -= 1">Trước</button>
            <button class="btn" type="button" :disabled="shiftPage >= shiftPageCount" @click="shiftPage += 1">Sau</button>
          </div>
        </template>
      </aside>
      <aside v-else class="pane detail empty">
        <p>Chọn một nhân viên bên trái để xem hồ sơ và lịch sử ca.</p>
      </aside>
    </div>

    <div v-if="editor" class="modal-back" @click.self="editor = null">
      <form class="modal" @submit.prevent="save">
        <div class="modal-head">
          <h3>{{ editor.id ? 'Sửa nhân viên' : 'Thêm nhân viên' }}</h3>
          <button class="close" type="button" @click="editor = null">✕</button>
        </div>
        <ImageField v-model="editor.avatarUrl" label="Ảnh đại diện" />
        <label>Họ tên<input v-model="editor.fullName" required placeholder="Nguyễn Hoàng Thang" /></label>
        <label>Email<input v-model="editor.email" type="email" required /></label>
        <div class="pair">
          <label>Số điện thoại<input v-model="editor.phone" placeholder="0987654321" /></label>
          <label>CCCD<input v-model="editor.citizenId" maxlength="12" placeholder="12 số" /></label>
        </div>
        <label>
          Chức vụ
          <select v-model="editor.position">
            <option v-for="item in positions" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label>Mật khẩu<input v-model="editor.password" type="password" :required="!editor.id" :placeholder="editor.id ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự'" /></label>
        <label class="check"><input v-model="editor.isActive" type="checkbox" /> Đang làm việc</label>
        <p class="hint">Lưu xong hệ thống cấp mã nhân viên. Mã này được dùng khi gán ca trực.</p>
        <div class="modal-foot">
          <button class="btn" type="button" @click="editor = null">Hủy</button>
          <button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? 'Đang lưu...' : 'Lưu' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  height: calc(100vh - 64px - 3rem);
  min-height: 420px;
}
.page-head, .detail-head, .modal-head, .modal-foot { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; }
.page-title, .detail h3, .modal h3 { margin: 0; }
.page-sub, .state, .hint, .detail-head p, .who small { color: var(--text-muted); }
.state.error { color: #fca5a5; }
.search, .modal input, .modal select {
  padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14);
  background: #0b0b0b; color: #fff; font-family: inherit;
}
.workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 0.75rem;
}
.pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.pane-scroll { flex: 1; min-height: 0; overflow: auto; }
.cards { display: grid; gap: 0.4rem; }
.card, .detail, .modal {
  background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: #fff;
}
.card {
  display: grid; grid-template-columns: auto 1fr auto; gap: 0.7rem; align-items: center;
  width: 100%; padding: 0.65rem 0.75rem; text-align: left; cursor: pointer; font-family: inherit;
}
.card.active { border-color: #3b82f6; }
.card.off { opacity: 0.72; }
.who { display: grid; min-width: 0; }
.who strong, .who small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.avatar {
  width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  font-weight: 800; overflow: visible; flex-shrink: 0; position: relative;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.duty-dot {
  position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px;
  border-radius: 50%; background: #22c55e; border: 2px solid #141414;
}
.live {
  display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;
  padding: 0.55rem 0.75rem; border-radius: 12px;
  background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.28);
}
.live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  animation: pulse 1.6s infinite;
}
.live-empty { color: var(--text-muted); }
.duty-chip {
  display: inline-flex; align-items: center; gap: 0.45rem;
  border: 1px solid rgba(34, 197, 94, 0.35); background: #141414; color: #fff;
  border-radius: 999px; padding: 0.25rem 0.65rem; cursor: pointer; font-family: inherit;
}
.duty-dot.wait { background: #f59e0b; }
.duty-chip.wait { border-color: rgba(245, 158, 11, 0.45); }
.duty-chip.wait small { color: #fcd34d; }
@keyframes pulse {
  70% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
.avatar.lg { width: 56px; height: 56px; font-size: 1.05rem; }
.pill { border-radius: 999px; padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; }
.pill.on { background: rgba(34,197,94,0.16); color: #86efac; }
.pill.off { background: rgba(248,113,113,0.16); color: #fca5a5; }
.detail {
  padding: 0.85rem;
  overflow: auto;
  background: #141414;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
}
.detail.empty {
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
}
.shift-head, .shift-pager { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.shift-head span, .shift-head h4 { margin: 0; }
.shift-head span { color: var(--text-muted); font-size: 0.8rem; }
.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem 0.8rem; margin: 0; }
.facts div { display: flex; justify-content: space-between; gap: 0.5rem; }
.facts dt { color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 700; }
.detail h4 { margin: 0.2rem 0 0; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.45rem 0.35rem; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; font-size: 0.82rem; }
.btn {
  border: 1px solid rgba(255,255,255,0.16); background: transparent; color: #fff;
  border-radius: 8px; padding: 0.45rem 0.75rem; cursor: pointer; font-family: inherit;
}
.btn-primary { background: #3b82f6; border-color: #3b82f6; }
.btn:disabled { opacity: 0.4; cursor: default; }
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,0.78); display: grid; place-items: center; z-index: 400; padding: 1rem; }
.modal { width: min(560px, 100%); padding: 1.1rem; display: grid; gap: 0.7rem; }
.modal label, .check { display: grid; gap: 0.3rem; color: #cbd5e1; font-size: 0.85rem; }
.check { grid-auto-flow: column; justify-content: start; align-items: center; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.close { width: 32px; height: 32px; border: none; background: transparent; color: #cbd5e1; cursor: pointer; }
.modal-foot { justify-content: flex-end; }
@media (max-width: 980px) {
  .page { height: auto; }
  .workspace, .pair { grid-template-columns: 1fr; }
  .pane-scroll { max-height: 280px; }
  .detail { max-height: none; }
}
</style>
