<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import PaymentBill from '../../components/PaymentBill.vue'
import { useToast } from '../../composables/useToast'
import { apiFetch } from '../../api'
import { paymentQrUrl } from '../../vietqr'

const router = useRouter()
const toast = useToast()

// Data
const movies = ref([])
const showtimes = ref([])
const seats = ref([])
const loading = ref(true)
const bank = ref({ bankBin: '', accountNumber: '', accountName: '' })
let paidTimer = null

// Step 1: chọn phim
const selectedMovieId = ref(null)

// Step 2: chọn suất
const selectedShowtimeId = ref(null)

// Step 3: chọn ghế
const selectedSeatIds = ref(new Set())

// Step 4: thông tin khách
const customerName = ref('')
const customerPhone = ref('')
const note = ref('')
const concessions = ref([])
const concessionQty = ref({})

// Created booking
const createdBooking = ref(null)
const creating = ref(false)
const confirming = ref(false)

const selectedMovie = computed(() =>
  movies.value.find((m) => m.id === selectedMovieId.value)
)

const movieShowtimes = computed(() =>
  showtimes.value.filter((s) => s.movieId === selectedMovieId.value)
)

const selectedShowtime = computed(() =>
  showtimes.value.find((s) => s.id === selectedShowtimeId.value)
)

const selectedSeatObjects = computed(() =>
  seats.value.filter((s) => selectedSeatIds.value.has(s.seatId))
)

const snackTotal = computed(() =>
  concessions.value.reduce((sum, item) => sum + item.price * (concessionQty.value[item.id] || 0), 0)
)
const totalPrice = computed(() => selectedSeatObjects.value.length * 75000 + snackTotal.value)

function changeQty(id, delta) {
  const item = concessions.value.find((row) => row.id === id)
  const max = Math.min(8, Number(item?.stockQuantity ?? 8))
  const next = Math.min(max, Math.max(0, (concessionQty.value[id] || 0) + delta))
  concessionQty.value = { ...concessionQty.value, [id]: next }
}

function selectedConcessions() {
  return concessions.value
    .filter((item) => (concessionQty.value[item.id] || 0) > 0)
    .map((item) => ({ concessionId: item.id, quantity: concessionQty.value[item.id] }))
}

const rows = computed(() => {
  const byRow = new Map()
  for (const seat of seats.value) {
    const row = (seat.seatNumber || '')[0] || '?'
    if (!byRow.has(row)) byRow.set(row, [])
    byRow.get(row).push(seat)
  }

  return [...byRow.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, list]) => {
      list.sort((a, b) =>
        (a.seatNumber || '').localeCompare(b.seatNumber || '', undefined, { numeric: true })
      )
      const isCouple = list.length > 0 && list.every((seat) => (seat.seatType ?? 0) === 2)
      if (!isCouple) {
        return {
          letter,
          isCouple: false,
          items: list.map((seat) => ({ key: seat.seatId, seats: [seat] })),
        }
      }
      const items = []
      for (let i = 0; i < list.length; i += 2) {
        const left = list[i]
        const right = list[i + 1]
        items.push({
          key: `${left.seatId}-${right?.seatId ?? 'x'}`,
          seats: right ? [left, right] : [left],
          label: right ? `${left.seatNumber}–${right.seatNumber}` : left.seatNumber,
        })
      }
      return { letter, isCouple: true, items }
    })
})

function seatState(list) {
  if (list.some((seat) => seat.isBooked)) return 'booked'
  if (list.every((seat) => selectedSeatIds.value.has(seat.seatId))) return 'selected'
  return 'available'
}

async function fetchAll() {
  loading.value = true
  try {
    const [movieList, showtimeList, menu] = await Promise.all([
      apiFetch('/api/Movies'),
      apiFetch('/api/showtimes'),
      apiFetch('/api/concessions').catch(() => []),
    ])
    movies.value = movieList ?? []
    showtimes.value = showtimeList ?? []
    concessions.value = menu ?? []
  } catch (e) {
    toast.error('Lỗi tải dữ liệu: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function selectShowtime(showtimeId) {
  selectedShowtimeId.value = showtimeId
  selectedSeatIds.value = new Set()

  try {
    const data = await apiFetch(`/api/showtimes/${showtimeId}/room-seats`)
    seats.value = data?.seats ?? []
  } catch (e) {
    toast.error('Lỗi tải ghế: ' + e.message)
  }
}

function toggleSeat(seat) {
  if (seat.isBooked) return
  const next = new Set(selectedSeatIds.value)

  const isCouple = (seat.seatType ?? 0) === 2
  if (isCouple) {
    const num = Number((seat.seatNumber || '').slice(1))
    const pairNum = num % 2 === 0 ? num - 1 : num + 1
    const rowLetter = (seat.seatNumber || '')[0]
    const pairSeat = seats.value.find(
      (s) => s.seatNumber === `${rowLetter}${pairNum}`
    )

    if (next.has(seat.seatId)) {
      next.delete(seat.seatId)
      if (pairSeat) next.delete(pairSeat.seatId)
    } else {
      next.add(seat.seatId)
      if (pairSeat && !pairSeat.isBooked) next.add(pairSeat.seatId)
    }
  } else {
    if (next.has(seat.seatId)) next.delete(seat.seatId)
    else next.add(seat.seatId)
  }

  selectedSeatIds.value = next
}

function stopPaidWatch() {
  if (paidTimer) clearInterval(paidTimer)
  paidTimer = null
}

async function checkTransferPaid() {
  const current = createdBooking.value
  if (!current?.bookingId || current.tickets) return
  try {
    const detail = await apiFetch(`/api/staff/bookings/${current.bookingId}`)
    if (String(detail?.status || '').toLowerCase() !== 'paid') return
    createdBooking.value = { ...current, tickets: detail.tickets || [], status: 'Paid' }
    stopPaidWatch()
    toast.success('Đã nhận tiền chuyển khoản. Có thể in vé.')
  } catch {
    // Giữ nguyên màn QR, lần kiểm tra sau sẽ thử lại.
  }
}

function startPaidWatch() {
  stopPaidWatch()
  paidTimer = setInterval(checkTransferPaid, 3000)
}

function reset() {
  stopPaidWatch()
  selectedMovieId.value = null
  selectedShowtimeId.value = null
  selectedSeatIds.value = new Set()
  seats.value = []
  customerName.value = ''
  customerPhone.value = ''
  note.value = ''
  concessionQty.value = {}
  createdBooking.value = null
}

async function createBooking() {
  if (!selectedShowtimeId.value) {
    toast.warning('Vui lòng chọn suất chiếu')
    return
  }
  if (selectedSeatIds.value.size === 0) {
    toast.warning('Vui lòng chọn ít nhất 1 ghế')
    return
  }

  creating.value = true
  try {
    createdBooking.value = await apiFetch('/api/staff/bookings/create-at-counter', {
      method: 'POST',
      body: JSON.stringify({
        showtimeId: selectedShowtimeId.value,
        seatIds: Array.from(selectedSeatIds.value),
        customerName: customerName.value || null,
        customerPhone: customerPhone.value || null,
        note: note.value || null,
        concessions: selectedConcessions(),
      }),
    })
    toast.success(`Đã tạo đơn #${createdBooking.value.bookingId}`)
    startPaidWatch()
  } catch (e) {
    toast.error('Lỗi: ' + e.message)
  } finally {
    creating.value = false
  }
}

async function confirmPayment() {
  if (!createdBooking.value) return

  confirming.value = true
  try {
    const result = await apiFetch(
      `/api/staff/bookings/${createdBooking.value.bookingId}/confirm-payment`,
      {
        method: 'POST',
        body: JSON.stringify({ note: note.value || null }),
      }
    )
    toast.success('Đã xác nhận thanh toán! In vé cho khách.')
    createdBooking.value = { ...createdBooking.value, tickets: result.tickets, status: 'Paid' }
  } catch (e) {
    toast.error('Lỗi: ' + e.message)
  } finally {
    confirming.value = false
  }
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

onMounted(async () => {
  try {
    const options = await apiFetch('/api/payment/methods')
    bank.value = {
      bankBin: options?.bankBin || '',
      accountNumber: options?.accountNumber || '',
      accountName: options?.accountName || '',
    }
  } catch {
    bank.value = { bankBin: '', accountNumber: '', accountName: '' }
  }
  fetchAll()
})
onUnmounted(stopPaidWatch)
</script>

<template>
  <div class="pos-page">
    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>

    <!-- STEP 1: Tạo đơn mới -->
    <template v-else-if="!createdBooking">
      <div class="page-head">
        <div>
          <h2 class="page-title">Bán vé tại quầy</h2>
          <p class="page-sub">Chọn phim, suất chiếu và ghế cho khách</p>
        </div>
      </div>

      <!-- STEP 1: Chọn phim -->
      <div class="panel">
        <h3 class="panel-step">
          <span class="step-num">1</span> Chọn phim
        </h3>
        <div class="movie-grid">
          <button
            v-for="m in movies"
            :key="m.id"
            class="movie-item"
            :class="{ active: selectedMovieId === m.id }"
            @click="selectedMovieId = m.id; selectedShowtimeId = null; seats = []; selectedSeatIds = new Set()"
          >
            <div class="movie-thumb">
              <img v-if="m.posterUrl" :src="m.posterUrl" :alt="m.title" />
              <AppIcon v-else name="movie" :size="24" />
            </div>
            <span class="movie-name">{{ m.title }}</span>
          </button>
        </div>
      </div>

      <!-- STEP 2: Chọn suất -->
      <div v-if="selectedMovieId" class="panel">
        <h3 class="panel-step">
          <span class="step-num">2</span> Chọn suất chiếu
        </h3>
        <div v-if="movieShowtimes.length === 0" class="empty">
          Phim này chưa có suất chiếu
        </div>
        <div v-else class="showtime-grid">
          <button
            v-for="st in movieShowtimes"
            :key="st.id"
            class="showtime-item"
            :class="{ active: selectedShowtimeId === st.id }"
            @click="selectShowtime(st.id)"
          >
            <span class="st-time">{{ new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }}</span>
            <span class="st-date">{{ new Date(st.startTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) }}</span>
            <span class="st-room">{{ st.roomName }}</span>
          </button>
        </div>
      </div>

      <!-- STEP 3: Chọn ghế -->
      <div v-if="selectedShowtimeId" class="panel">
        <h3 class="panel-step">
          <span class="step-num">3</span> Chọn ghế
          <span class="seat-count">{{ selectedSeatIds.size }} ghế</span>
        </h3>

        <div class="legend">
          <span><i class="dot available" /> Trống</span>
          <span><i class="dot selected" /> Đang chọn</span>
          <span><i class="dot booked" /> Đã đặt</span>
          <span><i class="dot couple" /> Ghế đôi</span>
        </div>

        <div class="screen-wrap">
          <div class="screen-curve" />
          <span class="screen-label">MÀN HÌNH</span>
        </div>

        <div class="rows">
          <div v-for="row in rows" :key="row.letter" class="row">
            <span class="row-label">{{ row.letter }}</span>
            <div class="seats-in-row" :class="{ 'couple-row': row.isCouple }">
              <button
                v-for="item in row.items"
                :key="item.key"
                type="button"
                class="seat"
                :class="[row.isCouple ? 'couple' : 'normal', seatState(item.seats)]"
                :disabled="item.seats.some((seat) => seat.isBooked)"
                @click="toggleSeat(item.seats[0])"
              >
                <span v-if="!row.isCouple">{{ item.seats[0].seatNumber.slice(1) }}</span>
                <span v-else class="couple-seats"><span class="couple-icon">♡</span>{{ item.label }}</span>
              </button>
            </div>
            <span class="row-label">{{ row.letter }}</span>
          </div>
        </div>
      </div>

      <!-- STEP 4: Thông tin khách + Xác nhận -->
      <div v-if="selectedShowtimeId && selectedSeatIds.size > 0" class="panel">
        <h3 class="panel-step">
          <span class="step-num">4</span> Thông tin khách (tùy chọn)
        </h3>

        <div class="form-grid">
          <div class="form-row">
            <label>Tên khách</label>
            <input v-model="customerName" type="text" placeholder="Nguyễn Văn A" />
          </div>
          <div class="form-row">
            <label>Số điện thoại</label>
            <input v-model="customerPhone" type="tel" placeholder="0901234567" />
          </div>
        </div>

        <div class="form-row">
          <label>Ghi chú</label>
          <input v-model="note" type="text" placeholder="VD: Khách yêu cầu xuất hóa đơn" />
        </div>

        <div class="checkout">
          <section v-if="concessions.length" class="menu">
            <div class="menu-head">
              <h4>Bắp nước</h4>
              <span>Chọn số phần. Mỗi món tối đa 8 và không vượt quá số còn.</span>
            </div>
            <div class="snack-row">
              <article
                v-for="item in concessions"
                :key="item.id"
                class="snack-card"
                :class="{ picked: (concessionQty[item.id] || 0) > 0 }"
              >
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                <div class="snack-body">
                  <strong>{{ item.name }}</strong>
                  <span class="price">{{ Number(item.price).toLocaleString('vi-VN') }}₫</span>
                  <span class="left">Còn {{ item.stockQuantity }}</span>
                  <div class="qty">
                    <button type="button" aria-label="Giảm" @click="changeQty(item.id, -1)">−</button>
                    <span>{{ concessionQty[item.id] || 0 }}</span>
                    <button type="button" aria-label="Tăng" @click="changeQty(item.id, 1)">+</button>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <aside class="summary-box">
            <h4>Hóa đơn tạm</h4>
            <div class="summary-row">
              <span class="summary-label">Phim</span>
              <span class="summary-value">{{ selectedShowtime.movieTitle }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Phòng</span>
              <span class="summary-value">{{ selectedShowtime.roomName }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Suất chiếu</span>
              <span class="summary-value">{{ new Date(selectedShowtime.startTime).toLocaleString('vi-VN') }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Ghế · {{ selectedSeatObjects.length }} × 75.000₫</span>
              <span class="summary-value">{{ selectedSeatObjects.map(s => s.seatNumber).join(', ') }}</span>
            </div>
            <div
              v-for="item in concessions.filter((row) => (concessionQty[row.id] || 0) > 0)"
              :key="item.id"
              class="summary-row"
            >
              <span class="summary-label">{{ item.name }} × {{ concessionQty[item.id] }}</span>
              <span class="summary-value">{{ (Number(item.price) * concessionQty[item.id]).toLocaleString('vi-VN') }}₫</span>
            </div>
            <div class="summary-row total">
              <span>Tổng tiền</span>
              <span class="total-amount">{{ totalPrice.toLocaleString('vi-VN') }}₫</span>
            </div>
          </aside>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" @click="reset">
            <AppIcon name="x" :size="18" />
            <span>Hủy</span>
          </button>
          <button class="btn btn-primary" :disabled="creating" @click="createBooking">
            <AppIcon name="ticket" :size="18" />
            <span>{{ creating ? 'Đang tạo...' : 'Tạo đơn & Xuất QR' }}</span>
          </button>
        </div>
      </div>
    </template>

    <!-- STEP 5: Hiển thị QR thanh toán + xác nhận -->
    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title">
            <span class="badge-success">Đã tạo đơn</span>
            #{{ createdBooking.bookingId }}
          </h2>
          <p class="page-sub">Khách quét QR tài khoản. Nội dung bắt buộc là VE {{ createdBooking.bookingId }}. Tiền vào đúng số tiền thì đơn tự xác nhận.</p>
        </div>
        <button v-if="!createdBooking.tickets" class="btn btn-secondary" @click="reset">
          <AppIcon name="plus" :size="18" />
          <span>Tạo đơn mới</span>
        </button>
      </div>

      <div class="payment-layout">
        <!-- Left: QR thanh toán -->
        <div v-if="!createdBooking.tickets" class="qr-card">
          <div class="print-sheet">
          <PaymentBill
            :code="createdBooking.bookingId"
            :movie="createdBooking.movieTitle"
            :room="createdBooking.roomName"
            :show-time="new Date(createdBooking.showTimeStart).toLocaleString('vi-VN')"
            :seats="createdBooking.seatNumbers || []"
            :concessions="createdBooking.concessions || []"
            :total="Number(createdBooking.totalPrice || 0)"
            :qr-url="paymentQrUrl(createdBooking.bookingId, createdBooking.totalPrice, bank)"
            :account-name="bank.accountName"
            :account-number="bank.accountNumber"
            channel="counter"
          />
          </div>

          <div class="payment-actions">
            <button type="button" class="btn btn-secondary" @click="printBill">
              <AppIcon name="printer" :size="18" />
              <span>In hóa đơn</span>
            </button>
            <a :href="createdBooking.paymentUrl" target="_blank" class="btn btn-secondary">
              <AppIcon name="eye" :size="18" />
              <span>Mở trang thanh toán</span>
            </a>
            <button
              class="btn btn-primary"
              :disabled="confirming"
              @click="confirmPayment"
            >
              <AppIcon name="check" :size="18" />
              <span>{{ confirming ? 'Đang xử lý...' : 'Xác nhận đã TT' }}</span>
            </button>
          </div>
        </div>

        <!-- Right: In vé -->
        <div v-else class="tickets-card">
          <div class="tickets-head">
            <h3 class="tickets-title">
              <AppIcon name="check" :size="20" />
              <span>Thanh toán thành công</span>
            </h3>
            <button class="btn btn-secondary" @click="printBill">
              <AppIcon name="printer" :size="16" />
              <span>In hóa đơn</span>
            </button>
          </div>

          <div class="print-sheet">
            <PaymentBill
              :code="createdBooking.bookingId"
              :movie="createdBooking.movieTitle"
              :room="createdBooking.roomName"
              :show-time="new Date(createdBooking.showTimeStart).toLocaleString('vi-VN')"
              :seats="createdBooking.seatNumbers || []"
              :concessions="createdBooking.concessions || []"
              :total="Number(createdBooking.totalPrice || 0)"
              :tickets="createdBooking.tickets || []"
              channel="counter"
            />
          </div>

          <div class="tickets-grid">
            <div
              v-for="t in createdBooking.tickets"
              :key="t.ticketId"
              class="ticket-card"
            >
              <div class="ticket-header">
                <span class="ticket-seat">Ghế {{ t.seatNumber }}</span>
              </div>
              <img :src="t.qrImageUrl" :alt="t.seatNumber" class="ticket-qr" />
              <span class="ticket-code">{{ t.qrCode.slice(0, 20) }}...</span>
            </div>
          </div>

          <div class="tickets-actions">
            <button class="btn btn-primary" @click="reset">
              <AppIcon name="plus" :size="18" />
              <span>Tạo đơn mới</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pos-page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 1200px; margin: 0 auto; }

.state { padding: 3rem; text-align: center; color: var(--text-muted); }
.spinner {
  width: 40px; height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.page-sub { color: var(--text-muted); font-size: 0.9rem; margin: 0.35rem 0 0; }

.badge-success {
  display: inline-flex;
  padding: 0.3rem 0.75rem;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}
.panel-step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1.25rem;
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
}
.seat-count {
  margin-left: auto;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* Movie grid */
.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}
.movie-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  border: 2px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.movie-item:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.05);
}
.movie-item.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.3);
}
.movie-thumb {
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(145deg, #1e293b, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.movie-thumb img { width: 100%; height: 100%; object-fit: cover; }
.movie-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Showtime grid */
.showtime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}
.showtime-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.85rem;
  border-radius: var(--radius-md);
  border: 2px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.showtime-item:hover {
  border-color: rgba(59, 130, 246, 0.4);
}
.showtime-item.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
}
.st-time {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}
.st-date { font-size: 0.75rem; color: var(--text-muted); }
.st-room {
  font-size: 0.8rem;
  color: #93c5fd;
  font-weight: 600;
  margin-top: 0.25rem;
}

.empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  flex-wrap: wrap;
}
.legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
.dot { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
.dot.available { background: var(--seat-available); }
.dot.selected { background: var(--seat-selected); }
.dot.booked { background: var(--seat-booked); }
.dot.couple { width: 22px; background: var(--seat-couple); border-radius: 4px 4px 2px 2px; }

/* Screen */
.screen-wrap {
  position: relative;
  width: 90%;
  max-width: 480px;
  margin: 0 auto 1.25rem;
  text-align: center;
}
.screen-curve {
  height: 24px;
  background: linear-gradient(to bottom, rgba(229, 9, 20, 0.4), transparent);
  border-top: 3px solid var(--accent-red);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  box-shadow: 0 -8px 32px rgba(229, 9, 20, 0.35);
}
.screen-label {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  letter-spacing: 0.4em;
  color: var(--text-muted);
  font-weight: 600;
}

/* Rows */
.rows {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: center;
}
.row { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
.row-label {
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.seats-in-row { display: flex; gap: 0.35rem; }
.couple-row { gap: 1rem; }

.seat.normal {
  width: 38px;
  height: 38px;
  border-radius: 8px 8px 4px 4px;
  border: none;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  font-family: inherit;
}
.seat.normal::after {
  content: '';
  position: absolute;
  bottom: -4px; left: 4px; right: 4px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: rgba(0, 0, 0, 0.4);
}
.seat.normal.available { background: var(--seat-available); }
.seat.normal.available:hover { background: var(--seat-available-hover); transform: translateY(-2px); }
.seat.couple {
  width: 86px;
  height: 44px;
  border-radius: 10px 10px 6px 6px;
  border: none;
  background: var(--seat-couple);
  color: #fff;
  cursor: pointer;
  position: relative;
  font-family: inherit;
}
.seat.couple::after {
  content: '';
  position: absolute;
  bottom: -4px; left: 6px; right: 6px;
  height: 4px;
  border-radius: 0 0 4px 4px;
  background: rgba(0, 0, 0, 0.4);
}
.seat.couple.available:hover { background: #c084fc; transform: translateY(-2px); }
.couple-seats { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.68rem; font-weight: 700; }
.couple-icon { color: #fde68a; }
.seat.booked {
  background: var(--seat-booked) !important;
  opacity: 0.55;
  cursor: not-allowed;
}
.seat.selected {
  background: var(--seat-selected) !important;
  transform: translateY(-2px);
  box-shadow: 0 0 18px rgba(229, 9, 20, 0.65);
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.form-row label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.form-row input {
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
}
.form-row input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* Checkout */
.checkout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.8fr);
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}
.menu-head { margin-bottom: 0.7rem; }
.menu-head h4, .summary-box h4 { margin: 0; font-size: 0.95rem; }
.menu-head span { display: block; margin-top: 0.2rem; color: var(--text-muted); font-size: 0.78rem; }

/* Summary */
.summary-box {
  padding: 1rem 1.05rem;
  background: #12151c;
  border: 1px solid rgba(59, 130, 246, 0.28);
  border-radius: 16px;
  position: sticky;
  top: 1rem;
}
.summary-box h4 { margin-bottom: 0.65rem; }
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  font-size: 0.9rem;
}
.summary-label { color: var(--text-muted); }
.summary-value { color: var(--text-primary); font-weight: 600; text-align: right; }
.summary-row.total {
  border-top: 1px solid rgba(59, 130, 246, 0.25);
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  font-size: 1rem;
}
.total-amount { color: var(--accent-gold); font-weight: 800; font-size: 1.25rem; }

/* Buttons */
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
  text-decoration: none;
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
.actions { display: flex; gap: 0.75rem; justify-content: flex-end; }

/* QR Card */
.payment-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 1.5rem;
}
@media (max-width: 900px) {
  .payment-layout { grid-template-columns: 1fr; }
}

.qr-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2rem;
  text-align: center;
}
.qr-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
  color: var(--text-primary);
}
.qr-image {
  width: 280px;
  height: 280px;
  background: #fff;
  padding: 1rem;
  border-radius: 12px;
  margin: 0 auto 1rem;
  display: block;
}
.qr-amount {
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent-gold);
  margin-bottom: 0.5rem;
}
.qr-note {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 1.5rem;
}

.payment-info {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
  text-align: left;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
  font-size: 0.85rem;
}
.info-row span:first-child { color: var(--text-muted); }
.info-row span:last-child { color: var(--text-primary); font-weight: 600; }

.payment-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Tickets */
.tickets-card {
  background: var(--bg-card);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}
.tickets-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.tickets-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #22c55e;
  margin: 0;
}
.tickets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.ticket-card {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.ticket-header {
  padding: 0.25rem 0.75rem;
  background: #3b82f6;
  color: #fff;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.ticket-qr {
  width: 140px;
  height: 140px;
}
.ticket-code {
  font-size: 0.65rem;
  color: #64748b;
  font-family: monospace;
  word-break: break-all;
  text-align: center;
}
.tickets-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.snack-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 0.7rem;
}
.snack-card {
  display: flex;
  flex-direction: column;
  background: #161616;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
}
.snack-card.picked { box-shadow: inset 0 0 0 1px #3b82f6; }
.snack-card img { width: 100%; height: 92px; object-fit: cover; display: block; background: #0b0b0b; }
.snack-body { display: grid; gap: 0.15rem; padding: 0.65rem 0.7rem 0.75rem; }
.snack-body strong { font-size: 0.88rem; line-height: 1.25; }
.price { color: var(--accent-gold); font-size: 0.82rem; font-weight: 700; }
.left { color: var(--text-muted); font-size: 0.75rem; }
.qty {
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
}
.qty span { text-align: center; font-weight: 800; }
.qty button {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #0b0b0b; color: #fff; cursor: pointer; font-size: 1rem;
}
@media (max-width: 860px) {
  .checkout { grid-template-columns: 1fr; }
  .summary-box { position: static; }
}

@media print {
  .sidebar, .topbar, .page-head, .tickets-actions, .tickets-head .btn-secondary { display: none !important; }
  .main-area, .staff-content { margin: 0 !important; padding: 0 !important; }
  .ticket-card { page-break-inside: avoid; }
}
</style>