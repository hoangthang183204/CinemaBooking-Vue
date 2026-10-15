<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { apiFetch } from '../api'

const route = useRoute()
const bookingId = ref(route.query.bookingId || '')
const status = ref(route.query.status || '')
const booking = ref(null)
const loading = ref(!!bookingId.value)

const isSuccess = computed(() => {
  const s = String(status.value || '').toLowerCase()
  return s === 'success' || s === 'already paid' || s === 'paid'
})

function statusLabel(s) {
  if (!s) return ''
  const lower = String(s).toLowerCase()
  if (lower === 'paid') return 'Đã thanh toán'
  if (lower === 'pending') return 'Chờ thanh toán'
  if (lower === 'cancelled') return 'Đã hủy'
  return s
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN')
}

onMounted(async () => {
  if (!bookingId.value) {
    loading.value = false
    return
  }
  try {
    booking.value = await apiFetch(`/api/bookings/${bookingId.value}`)
  } catch (_) {
    // im lặng — trang vẫn hiển thị trạng thái từ query
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>

    <template v-else>
      <div class="result-card" :class="isSuccess ? 'success' : 'fail'">
        <div class="icon-wrap">
          <div class="icon-ring" />
          <span class="icon">{{ isSuccess ? '✓' : '✕' }}</span>
        </div>
        <h1 class="title">
          {{ isSuccess ? 'Thanh toán thành công' : 'Thanh toán chưa hoàn tất' }}
        </h1>
        <p class="subtitle">
          {{
            isSuccess
              ? 'Vé của bạn đã được xác nhận. Chúc bạn xem phim vui vẻ!'
              : (status || 'Bạn có thể thử thanh toán lại từ trang đặt vé.')
          }}
        </p>
      </div>

      <div v-if="booking" class="ticket">
        <div class="ticket-header">
          <span class="ticket-label">Mã đặt chỗ</span>
          <span class="ticket-code">#{{ booking.id }}</span>
        </div>
        <div class="ticket-body">
          <div class="info-row">
            <span class="label">Phim</span>
            <span class="value">{{ booking.movieTitle }}</span>
          </div>
          <div class="info-row">
            <span class="label">Phòng</span>
            <span class="value">{{ booking.roomName }}</span>
          </div>
          <div class="info-row">
            <span class="label">Suất chiếu</span>
            <span class="value">{{ formatDateTime(booking.showTimeStart) }}</span>
          </div>
          <div class="info-row">
            <span class="label">Ghế</span>
            <span class="value">{{ (booking.seatNumbers || []).join(', ') || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Trạng thái</span>
            <span class="value">{{ statusLabel(booking.status) }}</span>
          </div>
        </div>
        <div class="ticket-footer">
          <span>Tổng tiền</span>
          <span class="total">
            {{ Number(booking.totalPrice || 0).toLocaleString('vi-VN') }}₫
          </span>
        </div>
      </div>

      <div class="actions">
        <router-link to="/my-tickets" class="btn btn-secondary">
          Vé của tôi
        </router-link>
        <router-link to="/" class="btn btn-primary">
          Về trang chủ
        </router-link>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { max-width: 480px; margin: 0 auto; padding: 2rem 1.5rem; }

.state {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 3rem; color: var(--text-muted);
}
.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.result-card {
  text-align: center;
  padding: 2rem 1.5rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
}
.result-card.success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.02));
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.result-card.fail {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(248, 113, 113, 0.02));
  border: 1px solid rgba(248, 113, 113, 0.3);
}
.icon-wrap {
  position: relative;
  width: 80px; height: 80px;
  margin: 0 auto 1rem;
  display: flex; align-items: center; justify-content: center;
}
.icon-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}
.success .icon-ring { background: rgba(34, 197, 94, 0.15); }
.fail .icon-ring { background: rgba(248, 113, 113, 0.15); }
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.6; }
}
.icon {
  position: relative;
  font-size: 2.25rem;
  font-weight: 800;
  width: 60px; height: 60px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  color: #fff;
}
.success .icon { background: var(--accent-green); box-shadow: 0 0 24px rgba(34,197,94,0.5); }
.fail .icon { background: #ef4444; box-shadow: 0 0 24px rgba(239,68,68,0.5); }

.title {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.subtitle {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.ticket {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
  position: relative;
}
.ticket::before, .ticket::after {
  content: '';
  position: absolute;
  width: 20px; height: 20px;
  background: var(--bg-primary);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}
.ticket::before { left: -10px; }
.ticket::after { right: -10px; }

.ticket-header {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px dashed var(--border-strong);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ticket-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.ticket-code { font-size: 1rem; font-weight: 800; color: var(--accent-gold); }

.ticket-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
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

.ticket-footer {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px dashed var(--border-strong);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.total {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--accent-gold);
  letter-spacing: -0.02em;
}

.actions { display: flex; gap: 0.75rem; }
.btn {
  flex: 1;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-primary {
  background: var(--accent-red);
  color: #fff;
  box-shadow: var(--shadow-glow-red);
}
.btn-primary:hover { background: var(--accent-red-hover); transform: translateY(-1px); }
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
}
</style>