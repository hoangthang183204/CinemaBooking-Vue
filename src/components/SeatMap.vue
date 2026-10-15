<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api'

const props = defineProps({
  seats: { type: Array, required: true },
  showTimeId: { type: Number, required: true },
})

const router = useRouter()

const selectedIds = ref(new Set())
const concessions = ref([])
const concessionQty = ref({})
const hold = ref(null)
const secondsLeft = ref(0)
const booking = ref({ loading: false, done: null, error: '' })

const MAX_SEATS = 8
const SEAT_TYPE = { NORMAL: 0, VIP: 1, COUPLE: 2 }
const STATUS = { AVAILABLE: 'available', BOOKED: 'booked', SELECTED: 'selected' }

let holdTimer = null
let countdownTimer = null
let holdSeq = 0

/**
 * Gộp ghế theo hàng.
 * - Hàng NORMAL: mỗi ghế hiển thị riêng.
 * - Hàng COUPLE: gộp 2 ghế liên tiếp thành 1 cặp (E1+E2, E3+E4, ...).
 */
const rows = computed(() => {
  const byRow = new Map()
  for (const s of props.seats) {
    const row = (s.seatNumber || '')[0] || '?'
    if (!byRow.has(row)) byRow.set(row, [])
    byRow.get(row).push(s)
  }

  const result = []
  const sortedRows = [...byRow.entries()].sort(([a], [b]) => a.localeCompare(b))

  for (const [letter, list] of sortedRows) {
    list.sort((a, b) =>
      (a.seatNumber || '').localeCompare(b.seatNumber || '', undefined, { numeric: true })
    )

    const isCoupleRow = list.every((s) => (s.seatType ?? 0) === SEAT_TYPE.COUPLE)

    if (isCoupleRow) {
      const pairs = []
      for (let i = 0; i < list.length; i += 2) {
        const a = list[i]
        const b = list[i + 1]
        pairs.push({
          kind: 'couple',
          key: `couple-${a.seatId}-${b?.seatId ?? 'x'}`,
          seats: b ? [a, b] : [a],
          label: `${a.seatNumber}–${b?.seatNumber ?? ''}`,
        })
      }
      result.push({ letter, isCouple: true, items: pairs })
    } else {
      result.push({
        letter,
        isCouple: false,
        items: list.map((s) => ({ kind: 'single', key: `seat-${s.seatId}`, seats: [s] })),
      })
    }
  }
  return result
})

function isBlocked(seat) {
  return !!(seat.isBooked || seat.isHeld)
}

function getSeatStatus(seat) {
  if (isBlocked(seat)) return STATUS.BOOKED
  if (selectedIds.value.has(seat.seatId)) return STATUS.SELECTED
  return STATUS.AVAILABLE
}

function getPairStatus(pairSeats) {
  if (pairSeats.some((s) => isBlocked(s))) return STATUS.BOOKED
  if (pairSeats.every((s) => selectedIds.value.has(s.seatId))) return STATUS.SELECTED
  if (pairSeats.some((s) => selectedIds.value.has(s.seatId))) return STATUS.SELECTED
  return STATUS.AVAILABLE
}

function toggleSingleSeat(seat) {
  if (isBlocked(seat)) return
  const next = new Set(selectedIds.value)
  if (next.has(seat.seatId)) next.delete(seat.seatId)
  else if (next.size >= MAX_SEATS) {
    booking.value.error = `Tối đa ${MAX_SEATS} ghế mỗi đơn.`
    return
  } else next.add(seat.seatId)
  booking.value.error = ''
  selectedIds.value = next
}

function toggleCouplePair(pairSeats) {
  if (pairSeats.some((s) => isBlocked(s))) return
  const next = new Set(selectedIds.value)
  const allSelected = pairSeats.every((s) => next.has(s.seatId))

  if (allSelected) {
    pairSeats.forEach((s) => next.delete(s.seatId))
  } else {
    const adding = pairSeats.filter((s) => !next.has(s.seatId))
    if (next.size + adding.length > MAX_SEATS) {
      booking.value.error = `Tối đa ${MAX_SEATS} ghế mỗi đơn.`
      return
    }
    adding.forEach((s) => next.add(s.seatId))
  }
  booking.value.error = ''
  selectedIds.value = next
}

function formatCountdown(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function startCountdown(expiresAt) {
  clearInterval(countdownTimer)
  const tick = () => {
    const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    secondsLeft.value = left
    if (left > 0) return
    clearInterval(countdownTimer)
    hold.value = null
    selectedIds.value = new Set()
    booking.value.error = 'Hết thời gian giữ ghế. Hãy chọn lại.'
  }
  tick()
  countdownTimer = setInterval(tick, 1000)
}

async function releaseHold() {
  const current = hold.value
  hold.value = null
  secondsLeft.value = 0
  clearInterval(countdownTimer)
  if (!current?.holdId) return
  try {
    await apiFetch(`/api/seat-holds/${current.holdId}`, { method: 'DELETE' })
  } catch {
    // Ghế hết hạn hoặc đã chuyển thành đơn đặt.
  }
}

async function syncHold() {
  const token = localStorage.getItem('cb_token')
  const seatIds = [...selectedIds.value]
  if (!token || booking.value.done) return false

  if (seatIds.length === 0) {
    await releaseHold()
    return false
  }

  const seq = ++holdSeq
  const result = await apiFetch(`/api/showtimes/${props.showTimeId}/seat-holds`, {
    method: 'POST',
    body: JSON.stringify({ seatIds }),
  })
  if (seq !== holdSeq) return false
  hold.value = result
  startCountdown(result.expiresAt)
  return true
}

function scheduleHold() {
  clearTimeout(holdTimer)
  holdTimer = setTimeout(async () => {
    if (!localStorage.getItem('cb_token')) return
    try {
      await syncHold()
    } catch (e) {
      booking.value.error = e.message || 'Không giữ được ghế'
    }
  }, 400)
}

const selectedList = computed(() =>
  props.seats.filter((s) => selectedIds.value.has(s.seatId))
)

const snackTotal = computed(() =>
  concessions.value.reduce((sum, item) => sum + item.price * (concessionQty.value[item.id] || 0), 0)
)

const totalPrice = computed(() => selectedList.value.length * 75000 + snackTotal.value)

const concessionGroups = computed(() => {
  const groups = new Map()
  for (const item of concessions.value) {
    if (!groups.has(item.category)) groups.set(item.category, [])
    groups.get(item.category).push(item)
  }
  return [...groups.entries()]
})

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

onMounted(async () => {
  try {
    const data = await apiFetch('/api/concessions')
    concessions.value = Array.isArray(data) ? data : []
  } catch {
    concessions.value = []
  }
})

watch(selectedIds, () => {
  if (booking.value.done) return
  scheduleHold()
})
watch(
  () => props.seats,
  (seats) => {
    if (booking.value.done) return
    const list = seats || []
    const blocked = new Set(list.filter((s) => s.isBooked || s.isHeld).map((s) => s.seatId))
    if ([...selectedIds.value].some((id) => blocked.has(id))) {
      selectedIds.value = new Set([...selectedIds.value].filter((id) => !blocked.has(id)))
      booking.value.error = 'Một ghế vừa được người khác giữ hoặc đặt.'
      return
    }
    if (selectedIds.value.size === 0) {
      const mine = list.filter((s) => s.isHeldByMe).map((s) => s.seatId)
      if (mine.length) selectedIds.value = new Set(mine)
    }
  },
  { immediate: true }
)
watch(
  () => props.showTimeId,
  async () => {
    await releaseHold()
    selectedIds.value = new Set()
  }
)

onBeforeUnmount(() => {
  clearTimeout(holdTimer)
  clearInterval(countdownTimer)
  if (!booking.value.done) releaseHold()
})

async function confirmBooking() {
  if (selectedList.value.length === 0) return

  const token = localStorage.getItem('cb_token')
  if (!token) {
    router.push({
      path: '/login',
      query: { redirect: `/book?showTimeId=${props.showTimeId}` },
    })
    return
  }

  clearTimeout(holdTimer)
  const seatIds = selectedList.value.map((s) => s.seatId)
  booking.value = { loading: true, done: null, error: '' }

  try {
    const held = await syncHold()
    if (!held) {
      booking.value.loading = false
      return
    }

    const result = await apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        showtimeId: props.showTimeId,
        seatIds,
        concessions: selectedConcessions(),
      }),
    })
    hold.value = null
    clearInterval(countdownTimer)
    secondsLeft.value = 0

    booking.value = { loading: false, done: result, error: '' }
    selectedIds.value = new Set()
  } catch (e) {
    booking.value = {
      loading: false,
      done: null,
      error: e.message || 'Đặt vé thất bại',
    }
  }
}
</script>

<template>
  <div class="seat-map-wrap">
    <!-- Legend -->
    <div class="legend">
      <span class="legend-item"><span class="dot available"></span> Trống</span>
      <span class="legend-item"><span class="dot selected"></span> Đang chọn</span>
      <span class="legend-item"><span class="dot booked"></span> Đã đặt</span>
      <span class="legend-item"><span class="dot couple"></span> Ghế đôi</span>
    </div>

    <!-- Screen -->
    <div class="screen-wrap">
      <div class="screen-curve" />
      <span class="screen-label">MÀN HÌNH</span>
    </div>

    <!-- Rows -->
    <div class="rows">
      <div v-for="row in rows" :key="row.letter" class="row">
        <span class="row-label">{{ row.letter }}</span>

        <div class="seats-in-row" :class="{ 'couple-row': row.isCouple }">
          <template v-if="!row.isCouple">
            <button
              v-for="item in row.items"
              :key="item.key"
              type="button"
              class="seat normal"
              :class="getSeatStatus(item.seats[0])"
              :disabled="isBlocked(item.seats[0])"
              :title="`${item.seats[0].seatNumber} - ${isBlocked(item.seats[0]) ? 'Không thể chọn' : 'Trống'}`"
              @click="toggleSingleSeat(item.seats[0])"
            >
              <span class="seat-number">{{ item.seats[0].seatNumber?.slice(1) }}</span>
            </button>
          </template>

          <template v-else>
            <button
              v-for="item in row.items"
              :key="item.key"
              type="button"
              class="seat couple"
              :class="getPairStatus(item.seats)"
              :disabled="item.seats.some((s) => isBlocked(s))"
              :title="`${item.label} - ${item.seats.some((s) => isBlocked(s)) ? 'Không thể chọn' : 'Ghế đôi'}`"
              @click="toggleCouplePair(item.seats)"
            >
              <span class="couple-seats">
                <span class="couple-icon">♡</span>
                <span class="couple-label">{{ item.label }}</span>
              </span>
            </button>
          </template>
        </div>

        <span class="row-label">{{ row.letter }}</span>
      </div>
    </div>

    <section v-if="concessionGroups.length" class="concessions">
      <h3>Bắp nước</h3>
      <p class="concession-note">Chọn thêm nếu muốn. Mỗi món tối đa 8 phần.</p>
      <div v-for="[category, items] in concessionGroups" :key="category" class="concession-group">
        <h4>{{ category }}</h4>
        <div class="concession-grid">
          <article v-for="item in items" :key="item.id" class="concession-card">
            <img :src="item.imageUrl" :alt="item.name" @error="(e) => e.target.style.display = 'none'" />
            <div class="concession-body">
              <strong>{{ item.name }}</strong>
              <span>{{ item.description }}</span>
              <span class="concession-price">{{ Number(item.price).toLocaleString('vi-VN') }}₫ · còn {{ item.stockQuantity }}</span>
              <div class="qty">
                <button type="button" @click="changeQty(item.id, -1)">−</button>
                <span>{{ concessionQty[item.id] || 0 }}</span>
                <button type="button" @click="changeQty(item.id, 1)">+</button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Summary -->
    <transition name="slide-up">
      <div v-if="selectedList.length > 0" class="summary-bar">
        <div class="summary-info">
          <div class="summary-seats">
            <span class="summary-label">Ghế đã chọn</span>
            <span class="summary-value">{{ selectedList.map(s => s.seatNumber).join(', ') }}</span>
          </div>
          <div v-if="snackTotal" class="summary-seats">
            <span class="summary-label">Bắp nước</span>
            <span class="summary-value">{{ snackTotal.toLocaleString('vi-VN') }}₫</span>
          </div>
          <div class="summary-price">
            <span class="summary-label">Tạm tính</span>
            <span class="summary-total">{{ totalPrice.toLocaleString('vi-VN') }}₫</span>
          </div>
          <div v-if="secondsLeft > 0" class="summary-timer">
            Giữ ghế còn {{ formatCountdown(secondsLeft) }}
          </div>
        </div>
        <button type="button" class="btn-confirm" :disabled="booking.loading" @click="confirmBooking">
          {{ booking.loading ? 'Đang xử lý...' : 'Xác nhận đặt vé' }}
        </button>
      </div>
    </transition>

    <div v-if="booking.error" class="alert error">{{ booking.error }}</div>
    <div v-if="booking.done" class="alert success">
      <div>
        <strong>Đặt chỗ thành công!</strong>
        <p>Mã: #{{ booking.done.bookingId }} — {{ Number(booking.done.totalPrice).toLocaleString('vi-VN') }}₫</p>
      </div>
      <router-link :to="'/payment/' + booking.done.bookingId" class="btn-go">Thanh toán →</router-link>
    </div>
  </div>
</template>

<style scoped>
.seat-map-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
}

.legend {
  display: flex;
  gap: 1.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  flex-wrap: wrap;
  justify-content: center;
}
.legend-item { display: flex; align-items: center; gap: 0.4rem; }
.dot { width: 14px; height: 14px; border-radius: 4px; }
.dot.available { background: var(--seat-available); }
.dot.booked { background: var(--seat-booked); }
.dot.selected { background: var(--seat-selected); }
.dot.couple {
  background: var(--seat-couple);
  border-radius: 4px 4px 2px 2px;
  width: 22px;
}

.screen-wrap {
  position: relative;
  width: 90%;
  max-width: 480px;
  margin-bottom: 1rem;
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

.rows {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.5rem;
  overflow-x: auto;
  max-width: 100%;
}
.row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.row-label {
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.seats-in-row { display: flex; gap: 0.35rem; }

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
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
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
.seat.normal.available:hover {
  background: var(--seat-available-hover);
  transform: translateY(-2px);
}

.seat.couple {
  width: 86px;
  height: 44px;
  border-radius: 10px 10px 6px 6px;
  border: none;
  cursor: pointer;
  position: relative;
  background: var(--seat-couple);
  color: #fff;
  padding: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.seat.couple::before {
  content: '';
  position: absolute;
  top: 6px; bottom: 6px;
  left: 50%;
  width: 1px;
  background: rgba(255, 255, 255, 0.18);
  transform: translateX(-50%);
  border-radius: 1px;
  pointer-events: none;
}
.seat.couple::after {
  content: '';
  position: absolute;
  bottom: -4px; left: 6px; right: 6px;
  height: 4px;
  border-radius: 0 0 4px 4px;
  background: rgba(0, 0, 0, 0.4);
}

.seat.couple.available:hover {
  background: #c084fc;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4);
}

.couple-seats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 100%;
  width: 100%;
  font-size: 0.7rem;
  font-weight: 700;
}
.couple-icon {
  color: #fde68a;
  font-size: 0.85rem;
  text-shadow: 0 0 6px rgba(253, 230, 138, 0.6);
}
.couple-label {
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.95);
}

.seat.booked {
  background: var(--seat-booked) !important;
  cursor: not-allowed;
  opacity: 0.55;
  filter: grayscale(0.3);
}
.seat.selected {
  background: var(--seat-selected) !important;
  transform: translateY(-2px);
  box-shadow: 0 0 18px rgba(229, 9, 20, 0.65);
}
.seat.selected:hover { background: var(--seat-selected-hover) !important; }

.seat-number { font-size: 0.7rem; }

.couple-row { gap: 1rem; }

.summary-bar {
  position: sticky;
  bottom: 1rem;
  width: 100%;
  max-width: 640px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: var(--shadow-hover);
  flex-wrap: wrap;
}
.summary-info { display: flex; gap: 2rem; flex-wrap: wrap; }
.summary-seats, .summary-price { display: flex; flex-direction: column; gap: 0.15rem; }
.summary-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.summary-timer {
  align-self: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fbbf24;
}
.summary-value {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.summary-total {
  font-size: 1.25rem;
  color: var(--accent-gold);
  font-weight: 800;
  letter-spacing: -0.02em;
}
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  background: var(--accent-red);
  color: #fff;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  white-space: nowrap;
  box-shadow: var(--shadow-glow-red);
}
.btn-confirm:hover:not(:disabled) {
  background: var(--accent-red-hover);
  transform: translateY(-1px);
}
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

.alert {
  width: 100%;
  max-width: 640px;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}
.alert.error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #fca5a5;
}
.alert.success {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #86efac;
  flex-wrap: wrap;
}
.alert.success strong { color: #22c55e; }
.alert.success p { margin: 0.25rem 0 0; font-size: 0.85rem; }
.btn-go {
  padding: 0.5rem 1rem;
  background: var(--accent-green);
  color: #062617;
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

.concessions {
  width: min(960px, 100%);
  text-align: left;
}
.concessions h3 { margin: 0 0 0.25rem; }
.concession-note { margin: 0 0 1rem; color: var(--text-muted); }
.concession-group h4 {
  margin: 0.8rem 0 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.concession-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 0.8rem;
}
.concession-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.concession-card img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
  background: #1a1a1a;
}
.concession-body {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
}
.concession-body span { color: var(--text-muted); font-size: 0.82rem; }
.concession-price { color: var(--accent-gold) !important; font-weight: 700; }
.qty { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.3rem; }
.qty button {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: transparent;
  color: #fff;
  cursor: pointer;
}
</style>