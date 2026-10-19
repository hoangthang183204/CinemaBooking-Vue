<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api'
import PaymentBill from '../components/PaymentBill.vue'
import { paymentQrUrl } from '../vietqr'

const props = defineProps({
  bookingId: { type: [String, Number], required: true },
})

const router = useRouter()

const booking = ref(null)
const loading = ref(true)
const error = ref('')
const paying = ref(false)
const payError = ref('')

const allMethods = [
  { id: 'counter', name: 'Tại quầy', desc: 'Hiện hóa đơn và QR để nhân viên thu tiền', icon: '🎟️' },
  { id: 'vnpay', name: 'VNPay', desc: 'Chuyển sang trang VNPay để trả bằng thẻ ATM hoặc ứng dụng ngân hàng', icon: '🏦' },
  { id: 'momo', name: 'MoMo', desc: 'Ví điện tử MoMo', icon: '📱' },
  { id: 'stripe', name: 'Stripe', desc: 'Thẻ quốc tế Visa/Master', icon: '💳' },
]
const vnpayReady = ref(false)
const methods = computed(() => allMethods.filter((item) => item.id !== 'vnpay' || vnpayReady.value))
const selectedMethod = ref('counter')
const billOpen = ref(false)
const onlineUrl = ref('')
const seatPrice = ref(75000)

const bill = computed(() => {
  const current = booking.value || {}
  const snackFromLines = (current.concessions || []).reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0
  )
  const seats = (current.seatNumbers || []).length
  const snack = Number(current.snackSubtotal) > 0 ? Number(current.snackSubtotal) : snackFromLines
  const ticket = Number(current.ticketSubtotal) > 0
    ? Number(current.ticketSubtotal)
    : seats * seatPrice.value
  const surcharge = Number(current.surchargeAmount) || 0
  let discount = Number(current.discountAmount) || 0
  if (!discount) {
    const gap = ticket + snack + surcharge - Number(current.totalPrice || 0)
    if (gap > 0) discount = gap
  }
  return {
    ticket,
    snack,
    surcharge,
    discount,
    code: current.promoCode || '',
    total: Number(current.totalPrice || 0),
  }
})

function getToken() {
  return localStorage.getItem('cb_token')
}

onMounted(async () => {
  const token = getToken()
  console.log('=== Payment onMounted ===')
  console.log('BookingId:', props.bookingId)
  console.log('Token exists:', !!token)

  if (!token) {
    router.push({
      path: '/login',
      query: { redirect: `/payment/${props.bookingId}` },
    })
    return
  }

  try {
    const [detail, options, settings] = await Promise.all([
      apiFetch(`/api/bookings/${props.bookingId}`),
      apiFetch('/api/payment/methods').catch(() => ({ vnpay: false })),
      apiFetch('/api/settings/public').catch(() => null),
    ])
    booking.value = detail
    if (settings?.seatPrice) seatPrice.value = Number(settings.seatPrice)
    vnpayReady.value = !!options?.vnpay
    if (!vnpayReady.value && selectedMethod.value === 'vnpay') selectedMethod.value = 'counter'
  } catch (e) {
    console.error('Error loading booking:', e.message)
    error.value = e.message || 'Không tải được thông tin đặt chỗ'
  } finally {
    loading.value = false
  }
})

async function goToPayment() {
  if (!booking.value) return

  const token = getToken()
  console.log('=== goToPayment ===')
  console.log('Token exists:', !!token)
  console.log('Method:', selectedMethod.value)

  if (!token) {
    router.push({
      path: '/login',
      query: { redirect: `/payment/${props.bookingId}` },
    })
    return
  }

  paying.value = true
  payError.value = ''
  onlineUrl.value = ''

  try {
    if (selectedMethod.value !== 'counter') {
      const result = await apiFetch(
        `/api/payment/bookings/${props.bookingId}/payment-url`,
        {
          method: 'POST',
          body: JSON.stringify({ method: selectedMethod.value }),
        }
      )
      if (!result?.paymentUrl) {
        payError.value = 'Không tạo được link thanh toán'
        return
      }
      if (selectedMethod.value === 'vnpay') {
        window.location.href = result.paymentUrl
        return
      }
      onlineUrl.value = result.paymentUrl
    }
    billOpen.value = true
  } catch (e) {
    console.error('Payment error:', e.message)
    payError.value = e.message || 'Lỗi kết nối cổng thanh toán'
  } finally {
    paying.value = false
  }
}

async function cancelOrder() {
  if (!booking.value) return
  const paid = String(booking.value.status).toLowerCase() === 'paid'
  const money = Number(booking.value.totalPrice || 0).toLocaleString('vi-VN')
  const message = paid
    ? `Hủy vé #${booking.value.id}? Mang mã đơn ra quầy để nhận lại ${money}₫.`
    : `Hủy đơn #${booking.value.id}? Ghế và bắp nước được trả lại.`
  if (!confirm(message)) return
  payError.value = ''
  try {
    await apiFetch(`/api/bookings/${booking.value.id}/cancel`, { method: 'POST' })
    router.push('/my-tickets')
  } catch (e) {
    payError.value = e.message || 'Không hủy được đơn'
  }
}

function statusLabel(status) {
  if (!status) return ''
  const s = String(status).toLowerCase()
  if (s === 'pending') return 'Chờ thanh toán'
  if (s === 'paid') return 'Đã thanh toán'
  if (s === 'cancelled') return 'Đã hủy'
  return status
}

function money(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}₫`
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN')
}
</script>

<template>
  <div class="page">
    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>

    <div v-else-if="error" class="state error">{{ error }}</div>

    <template v-else-if="booking">
      <h1 class="page-title">Thanh toán</h1>
      <p class="page-sub">Hoàn tất đặt vé của bạn</p>

      <div class="card summary-card">
        <div class="summary-head">
          <span class="badge">Mã đặt chỗ #{{ booking.id }}</span>
          <span
            class="status-pill"
            :class="String(booking.status || '').toLowerCase()"
          >
            {{ statusLabel(booking.status) }}
          </span>
        </div>
        <div class="summary-grid">
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
          <div v-if="booking.concessions?.length" class="info-row">
            <span class="label">Bắp nước</span>
            <span class="value">
              {{ booking.concessions.map((c) => `${c.name} x${c.quantity}`).join(', ') }}
            </span>
          </div>
        </div>
        <div class="money-lines">
          <div class="money-line">
            <span>Tiền ghế</span>
            <span>{{ money(bill.ticket) }}</span>
          </div>
          <div class="money-line">
            <span>Bắp nước</span>
            <span>{{ money(bill.snack) }}</span>
          </div>
          <div v-if="bill.surcharge > 0" class="money-line">
            <span>Phụ thu</span>
            <span>{{ money(bill.surcharge) }}</span>
          </div>
          <div class="money-line voucher">
            <span>Voucher {{ bill.code || (bill.discount > 0 ? 'đã áp dụng' : 'không dùng') }}</span>
            <span>-{{ money(bill.discount) }}</span>
          </div>
        </div>
        <div class="total-row">
          <span>Tổng thanh toán</span>
          <span class="total-amount">{{ money(bill.total) }}</span>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Phương thức thanh toán</h3>
        <div class="method-list">
          <label
            v-for="m in methods"
            :key="m.id"
            class="method-option"
            :class="{ active: selectedMethod === m.id }"
          >
            <input v-model="selectedMethod" type="radio" :value="m.id" />
            <span class="method-icon">{{ m.icon }}</span>
            <div class="method-info">
              <span class="method-name">{{ m.name }}</span>
              <span class="method-desc">{{ m.desc }}</span>
            </div>
            <span v-if="selectedMethod === m.id" class="method-check">✓</span>
          </label>
        </div>

        <p v-if="payError" class="pay-error">{{ payError }}</p>

        <div class="actions">
          <button
            type="button"
            class="btn btn-secondary"
            @click="cancelOrder"
          >
            Hủy đơn
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="paying"
            @click="goToPayment"
          >
            {{
              paying
                ? 'Đang chuyển sang cổng thanh toán...'
                : selectedMethod === 'vnpay'
                  ? `Thanh toán VNPay ${money(bill.total)}`
                  : `Thanh toán ${money(bill.total)}`
            }}
          </button>
        </div>
      </div>

      <div v-if="billOpen" class="bill-layer">
        <PaymentBill
          :code="booking.id"
          :movie="booking.movieTitle"
          :room="booking.roomName"
          :show-time="formatDateTime(booking.showTimeStart)"
          :seats="booking.seatNumbers || []"
          :concessions="booking.concessions || []"
          :ticket-subtotal="bill.ticket"
          :snack-subtotal="bill.snack"
          :surcharge="bill.surcharge"
          :discount="bill.discount"
          :promo-code="bill.code"
          :total="bill.total"
          :qr-url="paymentQrUrl(booking.id, booking.totalPrice)"
          :channel="selectedMethod === 'counter' ? 'counter' : 'web'"
        />
        <div class="bill-actions">
          <button type="button" class="btn btn-secondary" @click="billOpen = false">Đóng</button>
          <a v-if="onlineUrl" class="btn btn-primary" :href="onlineUrl">Mở cổng thanh toán</a>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { max-width: 560px; margin: 0 auto; padding: 1.5rem; }
.bill-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.72);
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.8rem;
  padding: 1rem;
  overflow: auto;
}
.bill-actions { display: flex; gap: 0.6rem; }
.bill-actions .btn { text-decoration: none; }
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

.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-subtle);
}
.card-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--text-primary);
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.badge {
  padding: 0.3rem 0.75rem;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.status-pill {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status-pill.pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; }
.status-pill.paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-pill.cancelled { background: rgba(248, 113, 113, 0.15); color: #f87171; }

.summary-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.money-lines { display: grid; gap: 0.45rem; padding-top: 0.9rem; }
.money-line { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.9rem; }
.money-line.voucher { color: #86efac; }
.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}
.total-amount {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent-gold);
  letter-spacing: -0.02em;
}

.method-list { display: flex; flex-direction: column; gap: 0.5rem; }
.method-option {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
  position: relative;
}
.method-option:hover {
  border-color: var(--border-strong);
  background: rgba(255, 255, 255, 0.05);
}
.method-option.active {
  border-color: var(--accent-red);
  background: rgba(229, 9, 20, 0.08);
}
.method-option input { display: none; }
.method-icon { font-size: 1.5rem; }
.method-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
.method-name { font-weight: 700; color: var(--text-primary); font-size: 0.95rem; }
.method-desc { font-size: 0.8rem; color: var(--text-muted); }
.method-check {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--accent-red);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.btn {
  flex: 1;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-primary {
  background: var(--accent-red);
  color: #fff;
  box-shadow: var(--shadow-glow-red);
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-red-hover);
  transform: translateY(-1px);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
}

.pay-error {
  color: #fca5a5;
  font-size: 0.9rem;
  margin: 0.75rem 0 0;
  padding: 0.6rem 0.85rem;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-sm);
}
</style>