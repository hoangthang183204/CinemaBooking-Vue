<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()

const list = ref([])
const loading = ref(true)
const error = ref('')
const selected = ref(null)
const cancelling = ref(false)

function getToken() {
  return localStorage.getItem('cb_token')
}

onMounted(async () => {
  const token = getToken()
  console.log('=== MyTickets onMounted ===')
  console.log('Token exists:', !!token)
  console.log('Token preview:', token ? token.slice(0, 40) + '...' : 'NULL')

  if (!token) {
    router.push({ path: '/login', query: { redirect: '/my-tickets' } })
    return
  }

  try {
    const data = await apiFetch('/api/users/my-bookings')
    list.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Error:', e.message)
    error.value = e.message || 'Không tải được danh sách vé'
  } finally {
    loading.value = false
  }
})

async function showDetail(booking) {
  if (selected.value?.id === booking.id) {
    selected.value = null
    return
  }

  const token = getToken()
  if (!token) return

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

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN')
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">Vé của tôi</h1>
    <p class="page-sub">Quản lý và xem chi tiết các vé đã đặt</p>

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
          v-for="b in list"
          :key="b.id"
          class="ticket-card"
          :class="[String(b.status || '').toLowerCase(), { active: selected?.id === b.id }]"
        >
          <button type="button" class="ticket-face" @click="showDetail(b)">
            <div class="stub">
              <span>Vé</span>
              <strong>#{{ b.id }}</strong>
            </div>
            <div class="ticket-main">
              <div class="title-row">
                <h3>{{ b.movieTitle }}</h3>
                <span class="status-pill" :class="String(b.status || '').toLowerCase()">
                  {{ statusLabel(b.status) }}
                </span>
              </div>
              <p>{{ formatDateTime(b.showTimeStart) }} · {{ b.roomName || 'Phòng' }}</p>
              <p>Ghế {{ (b.seatNumbers || []).join(', ') || '—' }}</p>
            </div>
            <div class="ticket-price">
              {{ Number(b.totalPrice || 0).toLocaleString('vi-VN') }}₫
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
                <span class="label">Tổng tiền</span>
                <span class="value total">{{ Number(selected.totalPrice || 0).toLocaleString('vi-VN') }}₫</span>
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

.tickets-list { display: flex; flex-direction: column; gap: 0.75rem; }

.ticket-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  overflow: hidden;
}
.ticket-card.active { border-color: rgba(229, 9, 20, 0.45); }
.ticket-face {
  width: 100%;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.stub {
  min-height: 108px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  background: #e50914;
  color: #fff;
}
.ticket-card.paid .stub { background: #15803d; }
.ticket-card.cancelled .stub,
.ticket-card.refunded .stub { background: #374151; }
.ticket-card.refundcompleted .stub { background: #0369a1; }
.stub span { font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; }
.stub strong { font-size: 1rem; }
.ticket-main { min-width: 0; padding: 0.85rem 0; }
.title-row { display: flex; align-items: center; gap: 0.55rem; }
.title-row h3 {
  margin: 0;
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ticket-main p { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.86rem; }
.status-pill {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status-pill.pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; }
.status-pill.paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-pill.cancelled, .status-pill.refunded { background: rgba(248, 113, 113, 0.15); color: #f87171; }
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
.ticket-price {
  padding-right: 1rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--accent-gold);
}
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
  .ticket-face { grid-template-columns: 64px minmax(0, 1fr); }
  .ticket-price { display: none; }
  .pay-box { flex-direction: column; align-items: stretch; }
}
</style>