<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
const staff = ref([])

const assignOpen = ref(false)
const assignStaffId = ref(null)
const assignNote = ref('')
const assigning = ref(false)

const approveTarget = ref(null)
const countedCash = ref(0)
const approveNote = ref('')
const approving = ref(false)

const history = ref(null)
const historyLoading = ref(false)
const now = ref(Date.now())
let clockTimer = 0
let pollTimer = 0

const onDuty = computed(() => list.value.filter((row) => row.status === 'Open'))
const handingOver = computed(() => {
  const seen = new Set()
  return list.value.filter((row) => {
    if (row.status !== 'Handover' || seen.has(row.staffId)) return false
    if (onDuty.value.some((open) => open.staffId === row.staffId)) return false
    seen.add(row.staffId)
    return true
  })
})

function money(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')}₫`
}

function when(value) {
  if (!value) return '—'
  const raw = String(value)
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
  return new Date(hasZone ? raw : `${raw}Z`).toLocaleString('vi-VN')
}

function isOnShift(staffId) {
  return list.value.some((row) => row.staffId === staffId && row.status === 'Open')
}

function statusLabel(status) {
  if (status === 'Open') return 'Đang mở'
  if (status === 'Handover') return 'Chờ bàn giao'
  if (status === 'Approved') return 'Đã duyệt'
  return 'Đã đóng'
}

function diffText(row) {
  if (row.cashDifference == null) return '—'
  const n = Number(row.cashDifference)
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('vi-VN')}₫`
}

function elapsed(startedAt) {
  if (!startedAt) return '00:00:00'
  const raw = String(startedAt)
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
  const date = new Date(hasZone ? raw : `${raw}Z`)
  const seconds = Math.max(0, Math.floor((now.value - date.getTime()) / 1000))
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
}

async function load(quiet = false) {
  if (!quiet) {
    loading.value = true
    error.value = ''
  }
  try {
    const [shifts, people] = await Promise.all([
      apiFetch('/api/admin/shifts'),
      apiFetch('/api/admin/staff-options'),
    ])
    list.value = shifts ?? []
    staff.value = people ?? []
    if (!assignStaffId.value && staff.value.length) assignStaffId.value = staff.value[0].id
    error.value = ''
  } catch (e) {
    if (!quiet) error.value = e.message
  } finally {
    loading.value = false
  }
}

async function assign() {
  assigning.value = true
  try {
    await apiFetch('/api/admin/shifts/assign', {
      method: 'POST',
      body: JSON.stringify({ staffId: Number(assignStaffId.value), note: assignNote.value || null }),
    })
    assignOpen.value = false
    assignNote.value = ''
    toast.success('Đã gán ca')
    await load()
  } catch (e) {
    toast.error(e.message)
  } finally {
    assigning.value = false
  }
}

function openApprove(row) {
  approveTarget.value = row
  countedCash.value = Number(row.expectedCash || 0)
  approveNote.value = row.note || ''
}

async function approve() {
  if (!approveTarget.value) return
  approving.value = true
  try {
    await apiFetch(`/api/admin/shifts/${approveTarget.value.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        countedCash: Number(countedCash.value || 0),
        note: approveNote.value || null,
      }),
    })
    toast.success('Đã duyệt ca')
    approveTarget.value = null
    await load()
  } catch (e) {
    toast.error(e.message)
  } finally {
    approving.value = false
  }
}

async function openHistory(row) {
  history.value = { ...row, lines: [] }
  historyLoading.value = true
  try {
    history.value = await apiFetch(`/api/admin/shifts/${row.id}`)
  } catch (e) {
    toast.error(e.message)
    history.value = null
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  load()
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') load(true)
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
        <h2 class="page-title">Quản lý ca trực</h2>
        <p class="page-sub">Một ca là khoảng nhân viên đứng quầy, từ lúc mở đến lúc kết thúc.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="assignOpen = true">
        <AppIcon name="plus" :size="16" /> Gán ca
      </button>
    </div>

    <ol class="steps">
      <li><strong>Nhân viên mở trang Ca trực</strong> thì ca tự mở. Không cần gán nếu người đó đã đăng nhập quầy.</li>
      <li><strong>Gán ca</strong> chỉ để mở ca giúp nhân viên chưa vào quầy. Mỗi người chỉ một ca đang mở.</li>
      <li><strong>Nhân viên bấm Kết thúc ca</strong>, in biên bản. Bạn đếm tiền mặt trong két rồi bấm Duyệt.</li>
    </ol>

    <div class="live">
      <span class="live-dot"></span>
      <strong>Ca hiện tại</strong>
      <span v-if="!onDuty.length && !handingOver.length" class="live-empty">Không có ai đang mở ca.</span>
      <span v-for="row in onDuty" :key="'on-' + row.id" class="duty-chip">
        {{ row.staffName }}
        <small>{{ elapsed(row.startedAt) }}</small>
      </span>
      <span v-for="row in handingOver" :key="'wait-' + row.id" class="duty-chip wait">
        {{ row.staffName }}
        <small>Chờ bàn giao</small>
      </span>
    </div>

    <p v-if="loading" class="state">Đang tải...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="!list.length" class="state">Chưa có ca nào.</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ca</th>
            <th>Nhân viên</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th>Tiền mặt hệ thống</th>
            <th>Tiền đếm</th>
            <th>Chênh lệch</th>
            <th>Chuyển khoản</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pageItems" :key="row.id">
            <td>#{{ row.id }}</td>
            <td>
              <strong>{{ row.staffName }}</strong>
              <span>{{ row.staffEmail }}</span>
            </td>
            <td>
              <span>{{ when(row.startedAt) }}</span>
              <span>{{ row.endedAt ? when(row.endedAt) : 'Đang làm' }}</span>
            </td>
            <td><span class="pill" :class="row.status.toLowerCase()">{{ statusLabel(row.status) }}</span></td>
            <td>{{ money(row.expectedCash) }}</td>
            <td>{{ row.countedCash == null ? '—' : money(row.countedCash) }}</td>
            <td :class="{ short: Number(row.cashDifference) < 0, over: Number(row.cashDifference) > 0 }">
              {{ diffText(row) }}
            </td>
            <td>{{ money(row.expectedTransfer) }}</td>
            <td class="actions">
              <button type="button" class="btn" @click="openHistory(row)">Lịch sử</button>
              <button v-if="row.status === 'Closed' || row.status === 'Handover'" type="button" class="btn btn-primary" @click="openApprove(row)">Duyệt</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AdminPager v-if="!loading && !error" v-model:page="page" :page-count="pageCount" :total="total" />

    <div v-if="assignOpen" class="modal-back" @click.self="assignOpen = false">
      <form class="modal" @submit.prevent="assign">
        <div class="modal-head">
          <h3>Gán ca cho nhân viên</h3>
          <button type="button" class="close" @click="assignOpen = false">✕</button>
        </div>
        <label>
          Nhân viên
          <select v-model="assignStaffId" required>
            <option v-for="person in staff" :key="person.id" :value="person.id" :disabled="isOnShift(person.id)">
              {{ person.fullName }} · {{ person.email }}{{ isOnShift(person.id) ? ' · đang trong ca' : '' }}
            </option>
          </select>
        </label>
        <label>Ghi chú<input v-model="assignNote" placeholder="Ca tối quầy 1" /></label>
        <p class="hint">Danh sách chỉ có tài khoản nhân viên. Bấm mở ca là ca bắt đầu ngay lúc này, không chọn ca sáng hay ca tối. Ghi chú chỉ là tên gọi, ví dụ “Ca tối quầy 1”. Người đang trong ca thì không gán thêm.</p>
        <div class="modal-foot">
          <button type="button" class="btn" @click="assignOpen = false">Hủy</button>
          <button class="btn btn-primary" type="submit" :disabled="assigning">{{ assigning ? 'Đang gán...' : 'Mở ca' }}</button>
        </div>
      </form>
    </div>

    <div v-if="approveTarget" class="modal-back" @click.self="approveTarget = null">
      <form class="modal" @submit.prevent="approve">
        <div class="modal-head">
          <h3>Duyệt ca #{{ approveTarget.id }}</h3>
          <button type="button" class="close" @click="approveTarget = null">✕</button>
        </div>
        <p>{{ approveTarget.staffName }} · hệ thống ghi nhận {{ money(approveTarget.expectedCash) }} tiền mặt và {{ money(approveTarget.expectedTransfer) }} chuyển khoản.</p>
        <label>Tiền mặt đếm được<input v-model.number="countedCash" type="number" min="0" step="1000" required /></label>
        <p class="hint">Chênh lệch = tiền đếm − tiền mặt hệ thống. Âm là thiếu, dương là thừa.</p>
        <label>Ghi chú<textarea v-model="approveNote" rows="2" /></label>
        <div class="modal-foot">
          <button type="button" class="btn" @click="approveTarget = null">Hủy</button>
          <button class="btn btn-primary" type="submit" :disabled="approving">{{ approving ? 'Đang lưu...' : 'Xác nhận doanh thu' }}</button>
        </div>
      </form>
    </div>

    <div v-if="history" class="modal-back" @click.self="history = null">
      <section class="modal wide">
        <div class="modal-head">
          <h3>Lịch sử ca #{{ history.id }} · {{ history.staffName }}</h3>
          <button type="button" class="close" @click="history = null">✕</button>
        </div>
        <p v-if="historyLoading">Đang tải...</p>
        <p v-else-if="!(history.lines || []).length">Ca này chưa có giao dịch.</p>
        <table v-else>
          <thead>
            <tr><th>Đơn</th><th>Phim</th><th>Ghế</th><th>Hình thức</th><th>Tiền</th></tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in history.lines" :key="`${line.bookingId}-${index}`">
              <td>#{{ line.bookingId }}</td>
              <td>{{ line.movieTitle }}</td>
              <td>{{ line.seats }}</td>
              <td>{{ line.method }}</td>
              <td>{{ money(line.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 0.85rem; }
.page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.page-title { margin: 0; }
.page-sub, .state, .hint, td span { color: var(--text-muted); }
.live {
  display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;
  padding: 0.55rem 0.75rem; border-radius: 12px;
  background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.28);
}
.live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
  animation: pulse 1.6s infinite;
}
.live-empty { color: var(--text-muted); }
.duty-chip {
  display: inline-flex; align-items: center; gap: 0.45rem;
  border: 1px solid rgba(34, 197, 94, 0.35); background: #141414; color: #fff;
  border-radius: 999px; padding: 0.25rem 0.65rem;
}
.duty-chip small { color: #86efac; font-variant-numeric: tabular-nums; }
.duty-chip.wait { border-color: rgba(245, 158, 11, 0.45); }
.duty-chip.wait small { color: #fcd34d; }
@keyframes pulse {
  70% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
.steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}
.steps li {
  counter-increment: step;
  background: #141414;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0.85rem 0.9rem 0.9rem 2.4rem;
  position: relative;
  color: #cbd5e1;
  line-height: 1.45;
  font-size: 0.88rem;
}
.steps li::before {
  content: counter(step);
  position: absolute;
  left: 0.75rem;
  top: 0.85rem;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  display: grid;
  place-items: center;
}
.steps strong { color: #fff; }
@media (max-width: 900px) {
  .steps { grid-template-columns: 1fr; }
}
.state.error { color: #fca5a5; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: #141414; border-radius: 14px; }
th, td { text-align: left; padding: 0.75rem 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; vertical-align: top; }
td strong, td span { display: block; }
.pill { display: inline-block; border-radius: 999px; padding: 0.2rem 0.55rem; font-size: 0.75rem; font-weight: 700; }
.pill.open { background: rgba(59,130,246,0.18); color: #93c5fd; }
.pill.handover { background: rgba(249, 115, 22, 0.18); color: #fdba74; }
.pill.closed { background: rgba(234,179,8,0.18); color: #fde68a; }
.pill.approved { background: rgba(34,197,94,0.16); color: #86efac; }
.short { color: #fca5a5; font-weight: 700; }
.over { color: #86efac; font-weight: 700; }
.actions { display: flex; gap: 0.4rem; }
.btn {
  display: inline-flex; align-items: center; gap: 0.35rem;
  border: 1px solid rgba(255,255,255,0.16); background: transparent; color: #fff;
  border-radius: 8px; padding: 0.45rem 0.75rem; cursor: pointer; font-family: inherit;
}
.btn-primary { background: var(--accent-red); border-color: var(--accent-red); }
.modal-back { position: fixed; inset: 0; background: rgba(0,0,0,0.78); display: grid; place-items: center; z-index: 400; padding: 1rem; }
.modal {
  width: min(480px, 100%); padding: 1.15rem; display: grid; gap: 0.75rem;
  background: #141414; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
}
.modal.wide { width: min(760px, 100%); }
.modal-head, .modal-foot { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; }
.modal h3 { margin: 0; }
.close { width: 32px; height: 32px; border: none; background: transparent; color: #cbd5e1; cursor: pointer; }
.modal label { display: grid; gap: 0.35rem; color: #cbd5e1; font-size: 0.85rem; }
.modal input, .modal textarea, .modal select {
  padding: 0.7rem 0.8rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14);
  background: #0b0b0b; color: #fff; font-family: inherit;
}
.modal-foot { justify-content: flex-end; }
</style>
