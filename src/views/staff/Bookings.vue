<script setup>
import { ref, onMounted, computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import AdminPager from '../../components/AdminPager.vue'
import PaymentBill from '../../components/PaymentBill.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'
import { paymentQrUrl } from '../../vietqr'

const toast = useToast()

const list = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const filter = ref('all')
const detail = ref(null)
const detailLoading = ref(false)

const filtered = computed(() => {
  let arr = list.value
  if (filter.value !== 'all') {
    arr = arr.filter((b) => b.status.toLowerCase() === filter.value)
  }
  const q = search.value.trim().toLowerCase()
  if (!q) return arr
  return arr.filter(
    (b) =>
      b.movieTitle.toLowerCase().includes(q) ||
      (b.userEmail || '').toLowerCase().includes(q) ||
      (b.customerPhone || '').includes(search.value.trim()) ||
      (b.customerName || '').toLowerCase().includes(q) ||
      String(b.id).includes(q)
  )
})

const { page, pageCount, total, items: pageItems } = usePager(filtered)

const counts = computed(() => ({
  all: list.value.length,
  pending: list.value.filter((b) => b.status === 'Pending').length,
  paid: list.value.filter((b) => b.status === 'Paid').length,
  cancelled: list.value.filter((b) => b.status === 'Cancelled').length,
}))

async function fetchList() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch('/api/staff/bookings')
    list.value = data ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function markPaid(b) {
  if (!confirm(`Xác nhận đơn #${b.id} đã thanh toán?`)) return
  try {
    await apiFetch(`/api/staff/bookings/${b.id}/mark-paid`, { method: 'POST' })
    await fetchList()
    toast.success(`Đã xác nhận thanh toán đơn #${b.id}`)
  } catch (e) {
    toast.error('Lỗi: ' + e.message)
  }
}

async function cancelBooking(b) {
  const paid = b.status === 'Paid'
  const message = paid
    ? `Hủy đơn #${b.id} đã thu tiền? Khách cần được hoàn ${formatMoney(b.totalPrice)} tại quầy.`
    : `Hủy đơn #${b.id}? Ghế và bắp nước được trả lại.`
  if (!confirm(message)) return
  try {
    await apiFetch(`/api/staff/bookings/${b.id}/cancel`, { method: 'POST' })
    await fetchList()
    toast.success(`Đã hủy đơn #${b.id}`)
  } catch (e) {
    toast.error('Không thể hủy: ' + e.message)
  }
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫'
}

function realName(booking) {
  const name = (booking?.customerName || '').trim()
  const email = (booking?.userEmail || '').trim()
  if (!name || name.toLowerCase() === email.toLowerCase()) return ''
  return name
}

function customerTitle(booking) {
  return realName(booking) || booking?.userEmail || 'Khách tại quầy'
}

function customerSub(booking) {
  const phone = (booking?.customerPhone || '').trim()
  if (phone) return phone
  if (realName(booking)) return booking.userEmail || ''
  return ''
}

function statusLabel(s, full = false) {
  const map = full
    ? { Paid: 'Đã thanh toán', Pending: 'Chờ thanh toán', Cancelled: 'Đã hủy', Refunded: 'Chờ hoàn tiền', RefundCompleted: 'Đã hoàn tiền' }
    : { Paid: 'Đã TT', Pending: 'Chờ TT', Cancelled: 'Đã hủy', Refunded: 'Chờ hoàn', RefundCompleted: 'Đã hoàn' }
  return map[s] || s
}

const refunding = ref(false)
const exchangeOpen = ref(false)
const exchangeShows = ref([])
const exchangeShowId = ref(null)
const exchangeSeats = ref([])
const exchangeSelected = ref(new Set())
const exchanging = ref(false)

async function startExchange() {
  exchangeOpen.value = true
  exchangeShowId.value = null
  exchangeSeats.value = []
  exchangeSelected.value = new Set()
  try {
    const all = await apiFetch('/api/showtimes')
    const movieId = detail.value?.movieId
    const title = detail.value?.movieTitle
    exchangeShows.value = (all || []).filter((st) => {
      const sameMovie = movieId ? st.movieId === movieId : st.movieTitle === title
      return sameMovie && new Date(st.startTime).getTime() > Date.now()
    })
  } catch (e) {
    toast.error(e.message || 'Không tải được suất chiếu')
  }
}

async function loadExchangeSeats(id) {
  exchangeShowId.value = id
  exchangeSelected.value = new Set()
  try {
    const data = await apiFetch(`/api/showtimes/${id}/room-seats`)
    exchangeSeats.value = data?.seats || []
  } catch (e) {
    toast.error(e.message || 'Không tải được ghế')
  }
}

function toggleExchangeSeat(seat) {
  if (seat.isBooked) return
  const next = new Set(exchangeSelected.value)
  if (next.has(seat.seatId)) next.delete(seat.seatId)
  else next.add(seat.seatId)
  exchangeSelected.value = next
}

async function submitExchange() {
  if (!detail.value) return
  exchanging.value = true
  try {
    const result = await apiFetch(`/api/staff/bookings/${detail.value.id}/exchange`, {
      method: 'POST',
      body: JSON.stringify({
        showtimeId: exchangeShowId.value,
        seatIds: [...exchangeSelected.value],
      }),
    })
    toast.success(result?.message || 'Đã đổi vé')
    detail.value = await apiFetch(`/api/staff/bookings/${detail.value.id}`)
    exchangeOpen.value = false
    await fetchList()
  } catch (e) {
    toast.error(e.message || 'Không đổi được vé')
  } finally {
    exchanging.value = false
  }
}

async function completeRefund(b) {
  const money = formatMoney(b.totalPrice)
  if (!confirm(`Xác nhận đã trả ${money} tiền mặt cho khách của đơn #${b.id}?`)) return
  refunding.value = true
  try {
    await apiFetch(`/api/staff/bookings/${b.id}/refund`, { method: 'POST' })
    toast.success(`Đã hoàn ${money} cho đơn #${b.id}`)
    if (detail.value?.id === b.id) detail.value = { ...detail.value, status: 'RefundCompleted' }
    await fetchList()
  } catch (e) {
    toast.error(e.message || 'Không hoàn được tiền')
  } finally {
    refunding.value = false
  }
}

function paymentQr(booking) {
  if (!booking || (booking.tickets || []).length) return ''
  return paymentQrUrl(booking.id, booking.totalPrice)
}

function printBill() {
  document.body.classList.add('printing-bill')
  const cleanup = () => {
    document.body.classList.remove('printing-bill')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

async function openDetail(booking) {
  exchangeOpen.value = false
  detail.value = {
    ...booking,
    concessions: booking.concessions || [],
    tickets: booking.tickets || [],
  }
  detailLoading.value = true
  try {
    detail.value = await apiFetch(`/api/staff/bookings/${booking.id}`)
  } catch (e) {
    toast.error(e.message || 'Không tải được chi tiết đơn')
  } finally {
    detailLoading.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Đơn đặt vé</h2>
        <p class="page-sub">{{ list.length }} đơn đặt</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-wrap">
        <AppIcon name="search" :size="16" class="search-icon" />
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Mã đơn, số điện thoại hoặc email"
        />
      </div>

      <div class="filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: filter === 'all' }"
          @click="filter = 'all'"
        >
          Tất cả <span class="count-badge">{{ counts.all }}</span>
        </button>
        <button
          class="filter-tab"
          :class="{ active: filter === 'pending' }"
          @click="filter = 'pending'"
        >
          Chờ TT <span class="count-badge warning">{{ counts.pending }}</span>
        </button>
        <button
          class="filter-tab"
          :class="{ active: filter === 'paid' }"
          @click="filter = 'paid'"
        >
          Đã TT <span class="count-badge success">{{ counts.paid }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="filtered.length === 0" class="state">Không có đơn nào.</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:70px">ID</th>
            <th>Khách hàng</th>
            <th>Phim</th>
            <th style="width:160px">Suất chiếu</th>
            <th style="width:120px">Ghế</th>
            <th style="width:120px">Tổng tiền</th>
            <th style="width:130px">Trạng thái</th>
            <th style="width:140px">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in pageItems" :key="b.id" class="row-link" @click="openDetail(b)">
            <td class="cell-id">#{{ b.id }}</td>
            <td>
              <div class="email-cell">{{ customerTitle(b) }}</div>
              <div v-if="customerSub(b)" class="cell-sub">{{ customerSub(b) }}</div>
            </td>
            <td>
              <div class="cell-title">{{ b.movieTitle }}</div>
              <div class="cell-sub">{{ b.roomName }}</div>
            </td>
            <td>{{ formatDateTime(b.showTimeStart) }}</td>
            <td>
              <span class="seats-badge">{{ (b.seatNumbers || []).join(', ') || '—' }}</span>
            </td>
            <td>
              <span class="money">{{ formatMoney(b.totalPrice) }}</span>
            </td>
            <td>
              <span class="badge" :class="b.status.toLowerCase()">
                {{ statusLabel(b.status) }}
              </span>
            </td>
            <td @click.stop>
              <div class="actions">
                <button
                  class="btn-icon"
                  title="Xem chi tiết"
                  @click="openDetail(b)"
                >
                  <AppIcon name="eye" :size="16" />
                </button>
                <button
                  v-if="b.status === 'Pending'"
                  class="btn-icon success"
                  title="Xác nhận đã thanh toán"
                  @click="markPaid(b)"
                >
                  <AppIcon name="check" :size="16" />
                </button>
                <button
                  v-if="b.status === 'Refunded'"
                  class="refund-action"
                  @click="completeRefund(b)"
                >
                  Hoàn tiền
                </button>
                <button
                  v-if="b.status !== 'Cancelled' && b.status !== 'Refunded' && b.status !== 'RefundCompleted'"
                  class="btn-icon danger"
                  title="Hủy đơn"
                  @click="cancelBooking(b)"
                >
                  <AppIcon name="x" :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AdminPager v-if="!loading && !error" v-model:page="page" :page-count="pageCount" :total="total" />

    <Teleport to="body">
      <div v-if="detail" class="modal-back" @click.self="detail = null">
        <section class="modal">
          <header class="modal-head">
            <div>
              <h3>Đơn #{{ detail.id }}</h3>
              <span class="badge" :class="String(detail.status || '').toLowerCase()">
                {{ statusLabel(detail.status, true) }}
              </span>
            </div>
            <button type="button" class="modal-close" @click="detail = null">✕</button>
          </header>

          <p v-if="detailLoading" class="detail-loading">Đang tải chi tiết...</p>

          <dl class="detail-grid">
            <div>
              <dt>Khách hàng</dt>
              <dd>{{ realName(detail) || 'Khách tại quầy' }}</dd>
            </div>
            <div>
              <dt>Điện thoại</dt>
              <dd>{{ detail.customerPhone || '—' }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ detail.userEmail || '—' }}</dd>
            </div>
            <div>
              <dt>Đặt lúc</dt>
              <dd>{{ formatDateTime(detail.createdAt) }}</dd>
            </div>
            <div>
              <dt>Phim</dt>
              <dd>{{ detail.movieTitle }}</dd>
            </div>
            <div>
              <dt>Phòng</dt>
              <dd>{{ detail.roomName }}</dd>
            </div>
            <div>
              <dt>Suất chiếu</dt>
              <dd>{{ formatDateTime(detail.showTimeStart) }}</dd>
            </div>
            <div>
              <dt>Ghế</dt>
              <dd>{{ (detail.seatNumbers || []).join(', ') || '—' }}</dd>
            </div>
          </dl>

          <div class="detail-block">
            <h4>Bắp nước</h4>
            <p v-if="!(detail.concessions || []).length" class="muted">Không có món kèm.</p>
            <ul v-else>
              <li v-for="item in detail.concessions" :key="item.name">
                <span>{{ item.name }} × {{ item.quantity }}</span>
                <span>{{ formatMoney(item.unitPrice * item.quantity) }}</span>
              </li>
            </ul>
          </div>

          <div class="detail-total">
            <span>Tổng tiền</span>
            <strong>{{ formatMoney(detail.totalPrice) }}</strong>
          </div>

          <div v-if="detail.status === 'Refunded'" class="refund-box">
            <p>Khách đã hủy vé đã thanh toán. Trả <strong>{{ formatMoney(detail.totalPrice) }}</strong> tiền mặt, rồi xác nhận.</p>
            <button type="button" class="print-btn" :disabled="refunding" @click="completeRefund(detail)">
              {{ refunding ? 'Đang lưu...' : 'Đã trả tiền cho khách' }}
            </button>
          </div>
          <p v-else-if="detail.status === 'RefundCompleted'" class="refund-done">
            Đã hoàn {{ formatMoney(detail.totalPrice) }} tại quầy.
          </p>
          <template v-else>
            <div class="print-sheet">
              <PaymentBill
                :code="detail.id"
                :movie="detail.movieTitle"
                :room="detail.roomName"
                :show-time="formatDateTime(detail.showTimeStart)"
                :seats="detail.seatNumbers || []"
                :concessions="detail.concessions || []"
                :total="Number(detail.totalPrice || 0)"
                :qr-url="paymentQr(detail)"
                :tickets="detail.tickets || []"
                channel="counter"
              />
            </div>
            <div class="modal-foot">
              <button type="button" class="print-btn" @click="printBill">In lại vé</button>
              <button
                v-if="detail.status === 'Pending' || detail.status === 'Paid'"
                type="button"
                class="print-btn alt"
                @click="startExchange"
              >
                Đổi vé
              </button>
              <button
                v-if="detail.status === 'Paid'"
                type="button"
                class="print-btn danger"
                @click="cancelBooking(detail)"
              >
                Hủy vé
              </button>
              <button
                v-if="detail.status === 'Pending'"
                type="button"
                class="print-btn danger"
                @click="cancelBooking(detail)"
              >
                Hủy đơn
              </button>
            </div>
            <div v-if="exchangeOpen" class="exchange">
              <h4>Đổi suất hoặc ghế</h4>
              <div class="show-picks">
                <button
                  v-for="st in exchangeShows"
                  :key="st.id"
                  type="button"
                  :class="{ on: exchangeShowId === st.id }"
                  @click="loadExchangeSeats(st.id)"
                >
                  {{ new Date(st.startTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
                  · {{ st.roomName }}
                </button>
              </div>
              <div v-if="exchangeSeats.length" class="seat-picks">
                <button
                  v-for="seat in exchangeSeats"
                  :key="seat.seatId"
                  type="button"
                  :disabled="seat.isBooked"
                  :class="{
                    sold: seat.isBooked,
                    on: exchangeSelected.has(seat.seatId),
                  }"
                  @click="toggleExchangeSeat(seat)"
                >
                  {{ seat.seatNumber }}
                </button>
              </div>
              <button type="button" class="print-btn" :disabled="exchanging || !exchangeSelected.size" @click="submitExchange">
                {{ exchanging ? 'Đang đổi...' : 'Xác nhận đổi vé' }}
              </button>
            </div>
          </template>
        </section>
      </div>
    </Teleport>
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

.toolbar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}
.search-wrap {
  flex: 1;
  min-width: 240px;
  max-width: 400px;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
}
.search-input:focus { outline: none; border-color: #3b82f6; }

.filter-tabs {
  display: flex;
  gap: 0.35rem;
  padding: 0.3rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.15s;
}
.filter-tab:hover { background: rgba(255, 255, 255, 0.05); }
.filter-tab.active {
  background: #3b82f6;
  color: #fff;
}
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.68rem;
  font-weight: 700;
}
.filter-tab.active .count-badge {
  background: rgba(255, 255, 255, 0.25);
}
.count-badge.warning { background: rgba(234, 179, 8, 0.2); color: #fbbf24; }
.count-badge.success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.filter-tab.active .count-badge.warning,
.filter-tab.active .count-badge.success {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.state { padding: 3rem; text-align: center; color: var(--text-muted); }
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #3b82f6;
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
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table thead { background: rgba(255, 255, 255, 0.03); }
.data-table th {
  text-align: left;
  padding: 0.9rem 1rem;
  font-size: 0.7rem;
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
.cell-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem; }

.email-cell {
  font-size: 0.8rem;
  color: var(--text-muted);
  word-break: break-all;
  max-width: 200px;
}

.seats-badge {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  background: rgba(139, 92, 246, 0.12);
  color: #c4b5fd;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
}

.money {
  font-weight: 800;
  color: var(--accent-gold);
  font-size: 0.9rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge::before {
  content: '';
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.badge.pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; }
.badge.paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.badge.cancelled, .badge.refunded { background: rgba(248, 113, 113, 0.15); color: #f87171; }
.badge.refundcompleted { background: rgba(56, 189, 248, 0.16); color: #38bdf8; }
.refund-action {
  height: 32px;
  padding: 0 0.65rem;
  border: none;
  border-radius: 8px;
  background: #e50914;
  color: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}
.refund-box {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: rgba(229, 9, 20, 0.12);
  border: 1px solid rgba(229, 9, 20, 0.35);
}
.refund-box p { margin: 0 0 0.75rem; }
.refund-done { margin: 1rem 0 0; color: #86efac; font-weight: 700; }
.modal-foot { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.print-btn.alt { background: #1d4ed8; }
.print-btn.danger { background: #b91c1c; }
.exchange { display: grid; gap: 0.6rem; margin-top: 0.8rem; }
.exchange h4 { margin: 0; }
.show-picks, .seat-picks { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.show-picks button, .seat-picks button {
  border: 1px solid rgba(255,255,255,0.14); background: #15803d; color: #fff;
  border-radius: 8px; padding: 0.4rem 0.55rem; cursor: pointer; font-family: inherit;
}
.show-picks button.on, .seat-picks button.on { background: #eab308; color: #111; }
.seat-picks button.sold { background: #dc2626; cursor: not-allowed; }

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
.btn-icon.success {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}
.btn-icon.success:hover {
  background: rgba(34, 197, 94, 0.2);
  transform: translateY(-1px);
}
.btn-icon.danger {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.3);
}
.btn-icon.danger:hover {
  background: rgba(248, 113, 113, 0.2);
  transform: translateY(-1px);
}
.row-link { cursor: pointer; }

.modal-back {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.78);
}
.modal {
  width: min(640px, 100%);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  padding: 1.2rem;
  background: #141414;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}
.modal-head, .detail-total, .detail-block li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.modal h3 { margin: 0 0 0.45rem; }
.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
}
.detail-loading, .muted { color: #94a3b8; }
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem 1rem;
  margin: 1rem 0;
}
.detail-grid dt { color: #94a3b8; font-size: 0.75rem; }
.detail-grid dd { margin: 0.15rem 0 0; font-weight: 700; }
.detail-block { margin-top: 0.4rem; }
.detail-block h4 { margin: 0 0 0.45rem; font-size: 0.95rem; }
.detail-block ul { list-style: none; margin: 0; padding: 0; }
.detail-block li { padding: 0.35rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.detail-total {
  margin-top: 0.8rem;
  padding-top: 0.7rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.detail-total strong { color: #fbbf24; font-size: 1.15rem; }
.ticket-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.ticket {
  width: 120px;
  text-align: center;
  font-size: 0.8rem;
  color: #cbd5e1;
}
.ticket img {
  width: 120px;
  height: 120px;
  display: block;
  border-radius: 8px;
  background: #fff;
  margin-bottom: 0.35rem;
}
.print-sheet { margin-top: 1rem; }
.modal-foot { display: flex; justify-content: flex-end; margin-top: 0.9rem; }
.print-btn {
  border: none;
  background: #e50914;
  color: #fff;
  border-radius: 8px;
  padding: 0.55rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
@media (max-width: 640px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>