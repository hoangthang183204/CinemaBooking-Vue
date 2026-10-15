<script setup>
import { ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { apiFetch } from '../../api'
import { paymentQrUrl } from '../../vietqr'

const toast = useToast()

const bookingId = ref('')
const loading = ref(false)
const booking = ref(null)

async function lookup() {
  const id = Number(bookingId.value)
  if (!id || id < 1) {
    toast.warning('Vui lòng nhập mã đơn hợp lệ')
    return
  }

  loading.value = true
  booking.value = null
  try {
    booking.value = await apiFetch(`/api/staff/bookings/${id}`)
    toast.success(`Đã tải đơn #${id}`)
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

function printQR() {
  window.print()
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫'
}

function statusLabel(status) {
  const map = {
    Paid: 'Đã thanh toán',
    Pending: 'Chờ thanh toán',
    Cancelled: 'Đã hủy',
    Refunded: 'Chờ hoàn tiền',
    RefundCompleted: 'Đã hoàn tiền',
  }
  return map[status] || status
}
</script>

<template>
  <div class="qr-page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Hiện lại QR để thu tiền</h2>
        <p class="page-sub">Dùng khi khách đã đặt vé nhưng chưa trả tiền. Nhập mã đơn, đưa khách quét QR chuyển khoản đúng số tiền.</p>
      </div>
    </div>

    <div class="lookup-card">
      <div class="lookup-form">
        <div class="input-wrap">
          <AppIcon name="search" :size="20" class="input-icon" />
          <input
            v-model="bookingId"
            type="number"
            min="1"
            placeholder="Nhập mã đơn (ví dụ: 124)"
            @keyup.enter="lookup"
          />
        </div>
        <button class="btn btn-primary" :disabled="loading" @click="lookup">
          <AppIcon name="search" :size="18" />
          <span>{{ loading ? 'Đang tìm...' : 'Tìm đơn' }}</span>
        </button>
      </div>

      <div v-if="booking" class="booking-result">
        <div class="result-head">
          <div>
            <h3 class="result-title">Đơn #{{ booking.id }}</h3>
            <span
              class="status-pill"
              :class="booking.status?.toLowerCase()"
            >
              {{ statusLabel(booking.status) }}
            </span>
          </div>
          <button class="btn btn-secondary" @click="printQR">
            <AppIcon name="eye" :size="16" />
            <span>In QR</span>
          </button>
        </div>

        <div class="result-grid">
          <div class="info-block">
            <div class="info-row">
              <span>Khách hàng</span>
              <span>{{ booking.userEmail || 'Guest' }}</span>
            </div>
            <div class="info-row">
              <span>Phim</span>
              <span>{{ booking.movieTitle }}</span>
            </div>
            <div class="info-row">
              <span>Phòng</span>
              <span>{{ booking.roomName }}</span>
            </div>
            <div class="info-row">
              <span>Suất chiếu</span>
              <span>{{ new Date(booking.showTimeStart).toLocaleString('vi-VN') }}</span>
            </div>
            <div class="info-row">
              <span>Ghế</span>
              <span>{{ (booking.seatNumbers || []).join(', ') }}</span>
            </div>
            <div class="info-row total-row">
              <span>Tổng tiền</span>
              <span class="total">{{ formatMoney(booking.totalPrice) }}</span>
            </div>
          </div>

          <div class="qr-block" v-if="booking.status !== 'Paid'">
            <div class="qr-title">QR Thanh toán</div>
            <img
              :src="paymentQrUrl(booking.id, booking.totalPrice)"
              alt="QR chuyển khoản"
              class="qr-image"
            />
            <div class="qr-amount">{{ formatMoney(booking.totalPrice) }}</div>
            <p class="qr-note">App ngân hàng sẽ điền sẵn số tiền này.</p>
          </div>

          <div class="qr-block success" v-else>
            <AppIcon name="check" :size="60" />
            <div class="qr-title success-text">Đã thanh toán</div>
            <p class="qr-note">Đơn này đã được thanh toán</p>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <AppIcon name="qrcode" :size="60" />
        <p>Nhập mã đơn, ví dụ 18, để hiện QR thu tiền.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 900px; margin: 0 auto; }

.page-head { display: flex; justify-content: space-between; align-items: center; }
.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}
.page-sub { color: var(--text-muted); font-size: 0.9rem; margin: 0.35rem 0 0; }

.lookup-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2rem;
}

.lookup-form {
  display: flex;
  gap: 0.75rem;
  max-width: 500px;
  margin: 0 auto 2rem;
}
.input-wrap {
  flex: 1;
  position: relative;
}
.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.input-wrap input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 3rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
}
.input-wrap input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.booking-result {
  padding: 1.5rem;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-md);
}
.result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}
.result-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.35rem;
}
.status-pill {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}
.status-pill.pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; }
.status-pill.paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-pill.cancelled { background: rgba(248, 113, 113, 0.15); color: #f87171; }

.result-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
}
@media (max-width: 768px) {
  .result-grid { grid-template-columns: 1fr; }
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--border-subtle);
  font-size: 0.9rem;
}
.info-row span:first-child { color: var(--text-muted); }
.info-row span:last-child { color: var(--text-primary); font-weight: 600; }
.total-row { border-bottom: none; margin-top: 0.5rem; padding-top: 1rem; border-top: 2px solid rgba(59, 130, 246, 0.3); }
.total { color: var(--accent-gold); font-size: 1.35rem; font-weight: 800; }

.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #fff;
  border-radius: 12px;
}
.qr-title {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}
.qr-image {
  width: 240px;
  height: 240px;
}
.qr-amount {
  font-size: 1.5rem;
  font-weight: 800;
  color: #e50914;
}
.qr-note {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
}
.qr-block.success {
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}
.success-text { color: #22c55e; }

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-muted);
}
.empty-state svg {
  color: var(--text-muted);
  opacity: 0.5;
  margin-bottom: 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.2s;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 0 24px rgba(59, 130, 246, 0.35);
}
.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}
.btn-secondary:hover { background: rgba(255, 255, 255, 0.12); color: var(--text-primary); }

@media print {
  .sidebar, .topbar, .page-head, .lookup-form, .result-head .btn-secondary { display: none !important; }
  .main-area, .staff-content { margin: 0 !important; padding: 0 !important; }
  .qr-block { background: #fff !important; }
}
</style>