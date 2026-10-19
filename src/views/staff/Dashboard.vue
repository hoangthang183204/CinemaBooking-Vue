<script setup>
import { computed, nextTick, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import { apiFetch } from '../../api'
import { useAuth } from '../../auth'

const router = useRouter()
const auth = useAuth()
const stats = ref(null)
const loading = ref(true)
const error = ref('')
const report = ref(null)
const closing = ref(false)
const accepting = ref(false)

const saved = ref([])
const ARCHIVE_SIZE = 8
const archivePage = ref(1)
const archiveCount = computed(() => Math.max(1, Math.ceil(saved.value.length / ARCHIVE_SIZE)))
const archiveItems = computed(() => {
  const start = (archivePage.value - 1) * ARCHIVE_SIZE
  return saved.value.slice(start, start + ARCHIVE_SIZE)
})

function shiftArchive(step) {
  const next = archivePage.value + step
  if (next < 1 || next > archiveCount.value) return
  archivePage.value = next
}

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [home, reports] = await Promise.all([
      apiFetch('/api/staff/dashboard'),
      apiFetch('/api/staff/reports').catch(() => []),
    ])
    stats.value = home
    saved.value = reports ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function closeShift() {
  closing.value = true
  error.value = ''
  try {
    report.value = await apiFetch('/api/staff/shift/close', { method: 'POST' })
    if (stats.value && report.value) {
      stats.value.shiftOpen = false
      stats.value.pendingOwnHandover = true
      stats.value.myCash = report.value.cashTotal
      stats.value.myTransfer = report.value.transferTotal
      stats.value.myRevenue = report.value.total
      stats.value.myTickets = report.value.ticketCount
      stats.value.myBookings = report.value.bookingCount
      if (report.value.cinemaRevenueToday) stats.value.cinemaRevenueToday = report.value.cinemaRevenueToday
    }
    saved.value = await apiFetch('/api/staff/reports').catch(() => saved.value)
    await nextTick()
  } catch (e) {
    error.value = e.message
  } finally {
    closing.value = false
  }
}

function leaveShift() {
  auth.logout()
  router.push('/login')
}

async function acceptHandover() {
  accepting.value = true
  error.value = ''
  try {
    await apiFetch('/api/staff/handover/accept', { method: 'POST' })
    report.value = null
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    accepting.value = false
  }
}

async function openShift() {
  try {
    await apiFetch('/api/staff/shift/open', { method: 'POST' })
    report.value = null
    await load()
  } catch (e) {
    error.value = e.message
  }
}

async function openSaved(id) {
  try {
    report.value = await apiFetch(`/api/staff/reports/${id}`)
  } catch (e) {
    error.value = e.message
  }
}

function printReport() {
  document.body.classList.add('printing-bill')
  const cleanup = () => {
    document.body.classList.remove('printing-bill')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫'
}

function formatDateTime(d) {
  if (!d) return '—'
  const raw = String(d)
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
  return new Date(hasZone ? raw : `${raw}Z`).toLocaleString('vi-VN')
}

function statusLabel(s) {
  const map = { Paid: 'Đã TT', Pending: 'Chờ TT', Cancelled: 'Đã hủy', Refunded: 'Chờ hoàn', RefundCompleted: 'Đã hoàn' }
  return map[s] || s
}
</script>

<template>
  <div class="dashboard">
    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-if="error" class="state error">{{ error }}</p>

    <template v-if="!loading && stats">
      <div v-if="stats.pendingFromName" class="take-modal">
        <div class="take-card">
          <p class="take-kicker">Nhận ca</p>
          <h3>Bạn đang nhận ca từ nhân viên {{ stats.pendingFromName }}.</h3>
          <p>Số tiền mặt đầu ca là <strong>{{ formatMoney(stats.pendingCash) }}</strong>. Xác nhận nhận ca?</p>
          <div class="take-actions">
            <button class="quick-btn sell" type="button" :disabled="accepting" @click="acceptHandover">
              {{ accepting ? 'Đang nhận...' : 'Xác nhận nhận ca' }}
            </button>
            <button class="quick-btn find" type="button" @click="leaveShift">Đăng xuất</button>
          </div>
        </div>
      </div>
      <div class="quick">
        <router-link to="/staff/pos" class="quick-btn sell">+ Bán vé mới</router-link>
        <router-link to="/staff/checkin" class="quick-btn scan">Quét mã soát vé</router-link>
        <router-link to="/staff/bookings" class="quick-btn find">Tra cứu khách</router-link>
        <button v-if="stats.shiftOpen" class="quick-btn close" type="button" :disabled="closing" @click="closeShift">
          {{ closing ? 'Đang chốt...' : 'Bàn giao ca' }}
        </button>
        <button v-else-if="stats.pendingOwnHandover" class="quick-btn close" type="button" @click="leaveShift">Xác nhận bàn giao</button>
        <button v-else-if="!stats.pendingFromName" class="quick-btn sell" type="button" @click="openShift">Mở ca mới</button>
      </div>
      <p v-if="stats.shiftOpen" class="shift-note">Bạn đang trong ca. Bán vé xong thì bấm Bàn giao ca, kiểm tra biên bản, rồi xác nhận để đăng xuất.</p>
      <p v-else-if="stats.pendingOwnHandover" class="shift-note">Ca của bạn đang chờ nhân viên kế tiếp nhận. Xác nhận bàn giao để đăng xuất.</p>
      <p v-else-if="!stats.pendingFromName" class="shift-note">Chưa có ca đang mở. Bấm Mở ca mới khi bắt đầu bán.</p>

      <div class="stats-grid">
        <div class="stat-card highlight">
          <div class="stat-icon">
            <AppIcon name="money" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Doanh thu toàn rạp hôm nay</span>
            <span class="stat-value">{{ formatMoney(stats.cinemaRevenueToday) }}</span>
          </div>
        </div>
        <div class="stat-card mine">
          <div class="stat-icon">
            <AppIcon name="ticket" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Đã thu hôm nay</span>
            <span class="stat-value">{{ formatMoney(stats.myRevenue) }}</span>
            <span class="stat-note">Mặt {{ formatMoney(stats.myCash) }} · Chuyển khoản {{ formatMoney(stats.myTransfer) }} · {{ stats.myTickets || 0 }} vé · {{ stats.myBookings || 0 }} đơn</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="check" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Đã thanh toán hôm nay</span>
            <span class="stat-value">{{ stats.paidToday }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="clock" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Chờ thanh toán</span>
            <span class="stat-value">{{ stats.pendingBookings }}</span>
          </div>
        </div>
      </div>

      <section v-if="report" class="sheet-wrap">
        <article class="print-sheet handover">
          <div class="sheet-bar" />
          <header>
            <p class="brand">NATIONAL CINEMA CENTER</p>
            <h2>Biên bản bàn giao ca</h2>
            <span class="who">{{ report.staffName }}</span>
            <span class="saved-flag">Đã lưu</span>
          </header>
          <div class="when">
            <div><span>Bắt đầu</span><strong>{{ formatDateTime(report.startedAt) }}</strong></div>
            <div><span>Kết thúc</span><strong>{{ formatDateTime(report.endedAt) }}</strong></div>
          </div>
          <div class="sheet-total">
            <span>Tổng đã thu</span>
            <strong>{{ formatMoney(report.total) }}</strong>
          </div>
          <div class="metrics">
            <div>
              <span>Tiền mặt</span>
              <strong>{{ formatMoney(report.cashTotal) }}</strong>
            </div>
            <div>
              <span>Chuyển khoản</span>
              <strong>{{ formatMoney(report.transferTotal) }}</strong>
            </div>
            <div>
              <span>Số vé</span>
              <strong>{{ report.ticketCount }}</strong>
            </div>
            <div>
              <span>Số đơn</span>
              <strong>{{ report.bookingCount }}</strong>
            </div>
          </div>
          <p class="cinema-line">Doanh thu toàn rạp hôm nay {{ formatMoney(report.cinemaRevenueToday || stats.cinemaRevenueToday) }}</p>
          <table v-if="report.lines?.length">
            <thead><tr><th>Đơn</th><th>Phim</th><th>Ghế</th><th>Hình thức</th><th>Tiền</th></tr></thead>
            <tbody>
              <tr v-for="line in report.lines" :key="`${line.bookingId}-${line.amount}`">
                <td>#{{ line.bookingId }}</td>
                <td>{{ line.movieTitle }}</td>
                <td>{{ line.seats }}</td>
                <td>{{ line.method }}</td>
                <td>{{ formatMoney(line.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
        <div class="sheet-actions">
          <button class="quick-btn scan reprint" type="button" @click="printReport">In biên bản</button>
          <button class="quick-btn close reprint" type="button" @click="leaveShift">Xác nhận bàn giao</button>
        </div>
      </section>

      <section class="archive">
        <div class="archive-head">
          <h3>Biên bản đã lưu</h3>
          <span v-if="saved.length">{{ saved.length }} tờ · trang {{ archivePage }}/{{ archiveCount }}</span>
        </div>
        <p v-if="!saved.length" class="shift-note">Chưa có biên bản nào.</p>
        <div v-else class="archive-table">
          <button
            v-for="item in archiveItems"
            :key="item.shiftId"
            type="button"
            class="archive-row"
            :class="{ active: report && report.shiftId === item.shiftId }"
            @click="openSaved(item.shiftId)"
          >
            <strong>Ca #{{ item.shiftId }}</strong>
            <span>{{ formatDateTime(item.endedAt) }}</span>
            <b>{{ formatMoney(item.total) }}</b>
          </button>
          <div v-if="archiveCount > 1" class="archive-pager">
            <button type="button" :disabled="archivePage === 1" @click="shiftArchive(-1)">Trước</button>
            <button type="button" :disabled="archivePage === archiveCount" @click="shiftArchive(1)">Sau</button>
          </div>
        </div>
      </section>

      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">Đơn đặt gần đây</h3>
          <router-link to="/staff/bookings" class="panel-link">Xem tất cả →</router-link>
        </div>
        <div v-if="!stats.recentBookings?.length" class="empty">
          Chưa có đơn nào
        </div>
        <div v-else class="booking-list">
          <div v-for="b in stats.recentBookings" :key="b.id" class="booking-row">
            <div class="booking-main">
              <span class="booking-id">#{{ b.id }}</span>
              <div>
                <div class="booking-movie">{{ b.movieTitle }}</div>
                <div class="booking-email">{{ b.userEmail }}</div>
              </div>
            </div>
            <div class="booking-meta">
              <span class="status-pill" :class="String(b.status || '').toLowerCase()">
                {{ statusLabel(b.status) }}
              </span>
              <span class="booking-price">{{ formatMoney(b.totalPrice) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 1.5rem; }
.quick { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.quick-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 38px; padding: 0 0.9rem;
  border-radius: 10px; font-size: 0.86rem; font-weight: 700; text-decoration: none;
  border: none; cursor: pointer; font-family: inherit; color: #fff;
}
.quick-btn.sell { background: #e50914; }
.quick-btn.scan { background: #2563eb; }
.quick-btn.find { background: #0f766e; }
.quick-btn.close { background: #b45309; }
.quick-btn:disabled { opacity: 0.6; cursor: wait; }
.shift-note { margin: -0.4rem 0 0; color: var(--text-muted); line-height: 1.45; }
.archive { display: grid; gap: 0.45rem; }
.archive-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; }
.archive-head h3 { margin: 0; font-size: 0.95rem; }
.archive-head span { color: var(--text-muted); font-size: 0.78rem; }
.archive-table {
  background: #141414;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
}
.archive-row {
  width: 100%;
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.45rem 0.75rem;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.archive-row:last-of-type { border-bottom: none; }
.archive-row strong { font-size: 0.82rem; }
.archive-row span { color: var(--text-muted); font-size: 0.78rem; }
.archive-row b { color: #fde68a; font-size: 0.82rem; font-weight: 700; }
.archive-row.active, .archive-row:hover { background: rgba(59, 130, 246, 0.12); }
.archive-pager { display: flex; justify-content: flex-end; gap: 0.4rem; padding: 0.45rem 0.65rem; }
.archive-pager button {
  height: 30px; padding: 0 0.7rem; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.14); background: transparent; color: #fff;
  font-family: inherit; font-size: 0.78rem; cursor: pointer;
}
.archive-pager button:disabled { opacity: 0.4; cursor: default; }
.stat-card.mine {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.16), rgba(234, 179, 8, 0.05));
  border-color: rgba(234, 179, 8, 0.35);
}
.stat-card.mine .stat-value { color: #fde68a; font-size: 1.35rem; }
.stat-note { color: var(--text-muted); font-size: 0.75rem; }
.sheet-wrap { display: grid; justify-items: center; gap: 0.85rem; }
.sheet-actions { display: flex; gap: 0.7rem; flex-wrap: wrap; justify-content: center; }
.reprint { min-width: 200px; }
.take-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.72);
  display: grid;
  place-items: center;
  padding: 1rem;
}
.take-card {
  width: min(520px, 100%);
  background: #141414;
  border: 1px solid rgba(59, 130, 246, 0.45);
  border-radius: 18px;
  padding: 1.4rem 1.3rem;
  display: grid;
  gap: 0.7rem;
}
.take-kicker { margin: 0; color: #93c5fd; font-weight: 800; letter-spacing: 0.06em; font-size: 0.78rem; }
.take-card h3 { margin: 0; font-size: 1.25rem; line-height: 1.35; }
.take-card p { margin: 0; color: #cbd5e1; line-height: 1.5; }
.take-card strong { color: #fde68a; }
.take-actions { display: flex; gap: 0.7rem; flex-wrap: wrap; }
.handover {
  width: min(680px, 100%);
  background: #fff;
  color: #111;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
}
.sheet-bar { height: 8px; background: linear-gradient(90deg, #e50914, #1d4ed8); }
.handover header { text-align: center; padding: 1.15rem 1.25rem 0.35rem; }
.handover .brand { margin: 0; letter-spacing: 0.14em; font-size: 0.72rem; font-weight: 800; color: #64748b; }
.handover h2 { margin: 0.3rem 0 0.15rem; font-size: 1.45rem; }
.handover .who { color: #334155; font-weight: 700; }
.saved-flag {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 0.72rem;
  font-weight: 800;
}
.when {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin: 0.9rem 1.15rem 0;
}
.when div {
  background: #f8fafc;
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
}
.when span { display: block; color: #64748b; font-size: 0.75rem; }
.when strong { display: block; margin-top: 0.15rem; font-size: 0.92rem; }
.sheet-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0.85rem 1.15rem 0;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: #0f172a;
  color: #fff;
}
.sheet-total span { color: #cbd5e1; }
.sheet-total strong { font-size: 1.7rem; color: #fde68a; letter-spacing: -0.03em; }
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
  margin: 0.75rem 1.15rem 0;
}
.metrics div {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.65rem 0.55rem;
  text-align: center;
}
.metrics span { display: block; color: #64748b; font-size: 0.75rem; }
.metrics strong { display: block; margin-top: 0.2rem; font-size: 1rem; }
.cinema-line { margin: 0.75rem 1.15rem 0; color: #475569; font-size: 0.85rem; text-align: center; }
.handover table { width: calc(100% - 2.3rem); border-collapse: collapse; margin: 0.85rem 1.15rem 1.15rem; font-size: 0.86rem; }
.handover th, .handover td { text-align: left; padding: 0.45rem 0.2rem; border-bottom: 1px solid #e2e8f0; }
.handover th { color: #64748b; font-size: 0.75rem; font-weight: 700; }
.handover th:last-child, .handover td:last-child { text-align: right; }
@media (max-width: 640px) {
  .metrics { grid-template-columns: 1fr 1fr; }
}

.state {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 3rem; color: var(--text-muted);
}
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}
.stat-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}
.stat-card.highlight {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.08));
  border-color: rgba(59, 130, 246, 0.3);
}
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  flex-shrink: 0;
}
.stat-info { display: flex; flex-direction: column; gap: 0.15rem; }
.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.stat-card.highlight .stat-value {
  color: #93c5fd;
  font-size: 1.35rem;
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.panel-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.panel-link {
  font-size: 0.8rem;
  color: #93c5fd;
  text-decoration: none;
  font-weight: 600;
}
.panel-link:hover { text-decoration: underline; }

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.booking-list { display: flex; flex-direction: column; gap: 0.5rem; }
.booking-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  gap: 1rem;
  flex-wrap: wrap;
}
.booking-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 200px;
}
.booking-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--accent-gold);
  font-weight: 700;
}
.booking-movie {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
}
.booking-email {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
.booking-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}
.booking-price {
  font-weight: 700;
  color: var(--accent-gold);
  font-size: 0.85rem;
}
.status-pill {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status-pill.pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; }
.status-pill.paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-pill.cancelled, .status-pill.refunded { background: rgba(248, 113, 113, 0.15); color: #f87171; }
.status-pill.refundcompleted { background: rgba(56, 189, 248, 0.16); color: #38bdf8; }
</style>