<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api'
import { useToast } from '../composables/useToast'

const PAGE_SIZE = 4
const router = useRouter()
const toast = useToast()

const list = ref([])
const page = ref(1)
const loading = ref(true)
const error = ref('')
const selected = ref(null)
const cancelling = ref(false)

const total = computed(() => list.value.length)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const pageItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return list.value.slice(start, start + PAGE_SIZE)
})
const rangeFrom = computed(() => (total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1))
const rangeTo = computed(() => Math.min(page.value * PAGE_SIZE, total.value))

onMounted(async () => {
  if (!localStorage.getItem('cb_token')) {
    router.push({ path: '/login', query: { redirect: '/my-tickets' } })
    return
  }

  try {
    const data = await apiFetch('/api/users/my-bookings')
    list.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e.message || 'Không tải được danh sách vé'
  } finally {
    loading.value = false
  }
})

function goPage(next) {
  if (next < 1 || next > pageCount.value || next === page.value) return
  page.value = next
  selected.value = null
}

async function showDetail(booking) {
  if (selected.value?.id === booking.id) {
    selected.value = null
    return
  }
  if (!localStorage.getItem('cb_token')) return
  try {
    selected.value = await apiFetch(`/api/bookings/${booking.id}`)
  } catch (_) {
    selected.value = null
  }
}

function qrImageUrl(qrCode) {
  if (!qrCode) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrCode)}`
}

function statusLabel(status) {
  if (!status) return ''
  const s = String(status).toLowerCase()
  if (s === 'paid') return 'Đã thanh toán'
  if (s === 'pending') return 'Chờ thanh toán'
  if (s === 'cancelled') return 'Đã hủy'
  if (s === 'refunded') return 'Chờ hoàn tiền tại quầy'
  if (s === 'refundcompleted') return 'Đã hoàn tiền'
  return status
}

function isPending(booking) {
  return String(booking?.status || '').toLowerCase() === 'pending'
}

function pay(booking) {
  router.push(`/payment/${booking.id}`)
}

const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000

function canCancel(booking) {
  if (!booking) return false
  const status = String(booking.status || '').toLowerCase()
  if (status !== 'pending' && status !== 'paid') return false
  const start = new Date(booking.showTimeStart)
  if (Number.isNaN(start.getTime())) return false
  return start.getTime() - Date.now() >= CANCEL_CUTOFF_MS
}

function cancelClosedNote(booking) {
  if (!booking) return ''
  const status = String(booking.status || '').toLowerCase()
  if (status !== 'pending' && status !== 'paid') return ''
  if (canCancel(booking)) return ''
  return 'Còn dưới 2 giờ trước giờ chiếu, không hủy được.'
}

async function cancelBooking(booking) {
  const paid = String(booking.status || '').toLowerCase() === 'paid'
  const money = Number(booking.totalPrice || 0).toLocaleString('vi-VN')
  const message = paid
    ? `Hủy vé #${booking.id}? Ghế được trả lại. Mang mã đơn ra quầy để nhận ${money}₫.`
    : `Hủy đơn #${booking.id}? Ghế và bắp nước được trả lại.`
  if (!confirm(message)) return

  cancelling.value = true
  try {
    await apiFetch(`/api/bookings/${booking.id}/cancel`, { method: 'POST' })
    const next = paid ? 'Refunded' : 'Cancelled'
    list.value = list.value.map((item) => (item.id === booking.id ? { ...item, status: next } : item))
    selected.value = { ...selected.value, status: next, tickets: [] }
    toast.success(paid ? 'Đã hủy vé. Mang mã đơn ra quầy để nhận lại tiền.' : 'Đã hủy đơn.')
  } catch (e) {
    toast.error(e.message || 'Không hủy được vé')
  } finally {
    cancelling.value = false
  }
}

function money(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function snackOf(booking) {
  if (Number(booking?.snackSubtotal) > 0) return Number(booking.snackSubtotal)
  return (booking?.concessions || []).reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0
  )
}

function ticketOf(booking) {
  if (Number(booking?.ticketSubtotal) > 0) return Number(booking.ticketSubtotal)
  const seats = (booking?.seatNumbers || []).length
  return seats * 75000
}

function discountOf(booking) {
  const stored = Number(booking?.discountAmount) || 0
  if (stored > 0) return stored
  const gap = ticketOf(booking) + snackOf(booking) + Number(booking?.surchargeAmount || 0) - Number(booking?.totalPrice || 0)
  return gap > 0 ? gap : 0
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN')
}

function showParts(d) {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return { day: '—', month: '', time: '' }
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: `Th${date.getMonth() + 1}`,
    time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Vé của tôi</h1>
    <p class="page-sub">{{ total ? `${total} vé đã đặt` : 'Quản lý và xem chi tiết các vé đã đặt' }}</p>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else>
      <div v-if="list.length === 0" class="empty">
        <span class="empty-icon">🎟</span>
        <p>Bạn chưa có vé nào.</p>
        <router-link to="/" class="btn-primary">Đặt vé ngay</router-link>
      </div>

      <div v-else class="tickets-list">
        <article
          v-for="b in pageItems"
          :key="b.id"
          class="ticket-card"
          :class="[String(b.status || '').toLowerCase(), { active: selected?.id === b.id }]"
        >
          <button type="button" class="ticket-face" @click="showDetail(b)">
            <div class="date-block" :class="String(b.status || '').toLowerCase()">
              <strong>{{ showParts(b.showTimeStart).day }}</strong>
              <span>{{ showParts(b.showTimeStart).month }}</span>
              <em>{{ showParts(b.showTimeStart).time }}</em>
            </div>
            <div class="ticket-main">
              <div class="title-row">
                <h3>{{ b.movieTitle }}</h3>
                <span class="status-pill" :class="String(b.status || '').toLowerCase()">
                  {{ statusLabel(b.status) }}
                </span>
              </div>
              <p>{{ b.roomName || 'Phòng' }} · Đơn #{{ b.id }}</p>
              <p class="seats">Ghế {{ (b.seatNumbers || []).join(', ') || '—' }}</p>
            </div>
            <div class="ticket-side">
              <strong>{{ Number(b.totalPrice || 0).toLocaleString('vi-VN') }}₫</strong>
              <span>{{ selected?.id === b.id ? 'Thu gọn' : 'Chi tiết' }}</span>
            </div>
          </button>

          <div v-if="selected?.id === b.id" class="detail-panel">
            <div class="detail-grid">
              <div class="info-row">
                <span class="label">Phim</span>
                <span class="value">{{ selected.movieTitle }}</span>
              </div>
              <div class="info-row">
                <span class="label">Suất chiếu</span>
                <span class="value">{{ formatDateTime(selected.showTimeStart) }}</span>
              </div>
              <div class="info-row">
                <span class="label">Phòng</span>
                <span class="value">{{ selected.roomName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Ghế</span>
                <span class="value">{{ (selected.seatNumbers || []).join(', ') || '—' }}</span>
              </div>
              <div v-if="selected.concessions?.length" class="info-row">
                <span class="label">Bắp nước</span>
                <span class="value">{{ selected.concessions.map((c) => `${c.name} × ${c.quantity}`).join(', ') }}</span>
              </div>
              <div class="info-row">
                <span class="label">Tiền ghế</span>
                <span class="value">{{ money(ticketOf(selected)) }}₫</span>
              </div>
              <div class="info-row">
                <span class="label">Bắp nước</span>
                <span class="value">{{ money(snackOf(selected)) }}₫</span>
              </div>
              <div v-if="Number(selected.surchargeAmount) > 0" class="info-row">
                <span class="label">Phụ thu</span>
                <span class="value">{{ money(selected.surchargeAmount) }}₫</span>
              </div>
              <div class="info-row">
                <span class="label">Voucher {{ selected.promoCode || (discountOf(selected) > 0 ? 'đã áp dụng' : 'không dùng') }}</span>
                <span class="value">-{{ money(discountOf(selected)) }}₫</span>
              </div>
              <div class="info-row">
                <span class="label">Tổng thanh toán</span>
                <span class="value total">{{ money(selected.totalPrice) }}₫</span>
              </div>
            </div>

            <div v-if="isPending(selected)" class="pay-box">
              <div>
                <strong>Đơn đang chờ thanh toán</strong>
                <p>Thanh toán để giữ vé. Có thể trả tại quầy bằng QR trên hóa đơn.</p>
              </div>
              <button type="button" class="pay-btn" @click="pay(selected)">Thanh toán</button>
            </div>

            <p v-if="cancelClosedNote(selected)" class="closed-note">{{ cancelClosedNote(selected) }}</p>
            <div v-if="canCancel(selected)" class="cancel-box">
              <button type="button" class="cancel-btn" :disabled="cancelling" @click="cancelBooking(selected)">
                {{ cancelling ? 'Đang hủy...' : 'Hủy vé' }}
              </button>
              <p v-if="String(selected.status).toLowerCase() === 'paid'">
                Vé đã thanh toán. Sau khi hủy, mang mã đơn ra quầy để nhận lại tiền.
              </p>
              <p v-else>Hủy sẽ trả ghế và bắp nước.</p>
            </div>

            <div v-if="selected.tickets?.length" class="qrs">
              <h4 class="qrs-title">Mã QR vào phòng</h4>
              <div class="qrs-grid">
                <div v-for="t in selected.tickets" :key="t.id" class="qr-block">
                  <img :src="qrImageUrl(t.qrCode)" :alt="'QR ' + t.seatNumber" class="qr-img" />
                  <span class="qr-seat">Ghế {{ t.seatNumber }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <nav v-if="total > PAGE_SIZE" class="pager" aria-label="Phân trang vé">
        <span>{{ rangeFrom }}–{{ rangeTo }} / {{ total }} vé</span>
        <div class="pager-actions">
          <button type="button" :disabled="page <= 1" @click="goPage(page - 1)">Trước</button>
          <button
            v-for="n in pageCount"
            :key="n"
            type="button"
            class="page-num"
            :class="{ on: n === page }"
            @click="goPage(n)"
          >{{ n }}</button>
          <button type="button" :disabled="page >= pageCount" @click="goPage(page + 1)">Sau</button>
        </div>
      </nav>
    </template>
  </div>
</template>

<style scoped>
.page { max-width: 760px; margin: 0 auto; padding: 1.5rem; }
.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.25rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.page-sub { color: var(--text-muted); margin: 0 0 1.5rem; font-size: 0.95rem; }

.state {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 3rem; color: var(--text-muted);
}
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
}
.empty-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; opacity: 0.6; }
.empty p { margin: 0.5rem 0 1.25rem; }
.btn-primary {
  display: inline-block;
  padding: 0.7rem 1.5rem;
  border-radius: var(--radius-md);
  background: var(--accent-red);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  box-shadow: var(--shadow-glow-red);
}

.tickets-list { display: flex; flex-direction: column; gap: 0.8rem; }

.ticket-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 18px;
  overflow: hidden;
}
.ticket-card.active { border-color: rgba(229, 9, 20, 0.5); }
.ticket-face {
  width: 100%;
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) auto;
  gap: 0;
  align-items: stretch;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.date-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  min-height: 112px;
  background: #1f2937;
  color: #fff;
  border-right: 1px dashed rgba(255,255,255,0.18);
}
.date-block strong { font-size: 1.45rem; line-height: 1; }
.date-block span { font-size: 0.75rem; color: #d1d5db; }
.date-block em { margin-top: 0.35rem; font-style: normal; font-size: 0.75rem; color: #fbbf24; }
.date-block.paid { background: #14532d; }
.date-block.pending { background: #78350f; }
.date-block.cancelled, .date-block.refunded { background: #374151; }
.date-block.refundcompleted { background: #0c4a6e; }
.ticket-main { min-width: 0; padding: 0.95rem 1rem; }
.title-row { display: flex; align-items: center; gap: 0.55rem; min-width: 0; }
.title-row h3 {
  margin: 0;
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ticket-main p { margin: 0.28rem 0 0; color: var(--text-muted); font-size: 0.86rem; }
.seats { color: var(--text-primary) !important; }
.status-pill {
  flex-shrink: 0;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
}
.status-pill.pending { background: rgba(251, 191, 36, 0.16); color: #fbbf24; }
.status-pill.paid { background: rgba(34, 197, 94, 0.16); color: #4ade80; }
.status-pill.cancelled, .status-pill.refunded { background: rgba(248, 113, 113, 0.16); color: #fca5a5; }
.status-pill.refundcompleted { background: rgba(56, 189, 248, 0.16); color: #7dd3fc; }
.ticket-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 1rem;
}
.ticket-side strong { color: var(--accent-gold); font-size: 1.05rem; }
.ticket-side span { color: var(--text-muted); font-size: 0.75rem; }
.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.pager-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pager button {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-primary);
  border-radius: 8px;
  min-width: 2.1rem;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  font-family: inherit;
}
.pager button.on { background: #e50914; border-color: #e50914; color: #fff; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.cancel-box {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--border-subtle);
}
.cancel-box p { margin: 0.45rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.cancel-btn {
  border: none;
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  background: #e50914;
  color: #fff;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
}
.cancel-btn:disabled { opacity: 0.6; cursor: default; }
.closed-note { margin: 0.8rem 0 0; color: #fbbf24; font-size: 0.85rem; }
.detail-panel {
  padding: 0 1rem 1rem 1rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.12);
}
.pay-box {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: rgba(229, 9, 20, 0.12);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}
.pay-box strong { display: block; }
.pay-box p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.pay-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  background: #e50914;
  color: #fff;
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed var(--border-subtle);
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}
.info-row .label { color: var(--text-muted); font-size: 0.85rem; }
.info-row .value {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.9rem;
  text-align: right;
}
.info-row .value.total { color: var(--accent-gold); font-weight: 800; }

.qrs { margin-top: 1.25rem; }
.qrs-title {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin: 0 0 0.75rem;
}
.qrs-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem;
  background: #fff;
  border-radius: var(--radius-sm);
}
.qr-img {
  width: 120px;
  height: 120px;
  border-radius: 4px;
  display: block;
}
.qr-seat {
  font-size: 0.8rem;
  color: #0f172a;
  font-weight: 700;
}

@media (max-width: 640px) {
  .ticket-face { grid-template-columns: 72px minmax(0, 1fr); }
  .ticket-side { display: none; }
  .pay-box { flex-direction: column; align-items: stretch; }
  .pager { flex-direction: column; align-items: flex-start; }
}
</style>