<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from '../../composables/useToast'
import { apiFetch } from '../../api'

const toast = useToast()
const form = ref({
  seatPrice: 75000,
  openTime: '08:00',
  closeTime: '23:30',
  weekendSurcharge: 0,
  lateShowSurcharge: 0,
  lateShowAfter: '21:00',
  lowStockAlert: 10,
})
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const seatPrice = computed(() => money(form.value.seatPrice))
const weekendFee = computed(() => money(form.value.weekendSurcharge))
const lateFee = computed(() => money(form.value.lateShowSurcharge))
const weekdayPrice = computed(() => seatPrice.value)
const weekendPrice = computed(() => seatPrice.value + weekendFee.value)
const lateWeekdayPrice = computed(() => seatPrice.value + lateFee.value)
const lateWeekendPrice = computed(() => seatPrice.value + weekendFee.value + lateFee.value)

const openMin = computed(() => minutes(form.value.openTime, 8 * 60))
const closeMin = computed(() => minutes(form.value.closeTime, 23 * 60 + 30))
const lateMin = computed(() => minutes(form.value.lateShowAfter, 21 * 60))
const openPct = computed(() => (openMin.value / 1440) * 100)
const closePct = computed(() => (closeMin.value / 1440) * 100)
const latePct = computed(() => (lateMin.value / 1440) * 100)
const spanPct = computed(() => Math.max(closePct.value - openPct.value, 0))
const hoursInvalid = computed(() => closeMin.value <= openMin.value)

onMounted(async () => {
  try {
    form.value = await apiFetch('/api/admin/settings')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    form.value = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(form.value),
    })
    toast.success('Đã lưu cấu hình rạp')
  } catch (e) {
    error.value = e.message
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}

function money(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

function minutes(value, fallback) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return fallback
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return fallback
  return hour * 60 + minute
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN') + 'đ'
}

function clock(value) {
  const total = minutes(value, 0)
  const hour = String(Math.floor(total / 60)).padStart(2, '0')
  const minute = String(total % 60).padStart(2, '0')
  return `${hour}:${minute}`
}
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <p class="kicker">Vận hành rạp</p>
        <h2>Cấu hình hệ thống</h2>
        <p class="sub">Giá vé, khung giờ chiếu và mức cảnh báo kho. Suất ngoài giờ mở cửa sẽ không tạo được.</p>
      </div>
      <button class="save" type="button" :disabled="saving || loading" @click="save">
        {{ saving ? 'Đang lưu...' : 'Lưu cấu hình' }}
      </button>
    </header>

    <p v-if="loading" class="state">Đang tải cấu hình...</p>

    <form v-else class="stack" @submit.prevent="save">
      <section class="summary">
        <article>
          <span>Khung giờ</span>
          <strong>{{ clock(form.openTime) }} – {{ clock(form.closeTime) }}</strong>
        </article>
        <article>
          <span>Ngày thường</span>
          <strong>{{ formatMoney(weekdayPrice) }}</strong>
        </article>
        <article>
          <span>Cuối tuần</span>
          <strong>{{ formatMoney(weekendPrice) }}</strong>
        </article>
        <article>
          <span>Suất tối cuối tuần</span>
          <strong>{{ formatMoney(lateWeekendPrice) }}</strong>
        </article>
      </section>

      <div class="layout">
        <section class="card">
          <div class="card-head">
            <h3>Giá vé</h3>
            <p>Mỗi ghế cộng giá gốc với phụ thu đang áp dụng.</p>
          </div>

          <label class="control">
            <span>Giá gốc</span>
            <div class="input-wrap">
              <input v-model.number="form.seatPrice" type="number" min="0" step="1000" />
              <em>đ / ghế</em>
            </div>
          </label>

          <div class="split">
            <label class="control">
              <span>Phụ thu thứ 7, Chủ nhật</span>
              <div class="input-wrap">
                <input v-model.number="form.weekendSurcharge" type="number" min="0" step="1000" />
                <em>đ</em>
              </div>
            </label>
            <label class="control">
              <span>Phụ thu suất tối</span>
              <div class="input-wrap">
                <input v-model.number="form.lateShowSurcharge" type="number" min="0" step="1000" />
                <em>đ</em>
              </div>
            </label>
          </div>

          <div class="examples">
            <div>
              <span>Ngày thường</span>
              <b>{{ formatMoney(weekdayPrice) }}</b>
            </div>
            <div>
              <span>Cuối tuần</span>
              <b>{{ formatMoney(weekendPrice) }}</b>
            </div>
            <div>
              <span>Suất tối</span>
              <b>{{ formatMoney(lateWeekdayPrice) }}</b>
            </div>
            <div class="peak">
              <span>Tối cuối tuần</span>
              <b>{{ formatMoney(lateWeekendPrice) }}</b>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3>Khung giờ chiếu</h3>
            <p>Vạch đỏ là giờ rạp mở. Vạch vàng là mốc bắt đầu tính suất tối.</p>
          </div>

          <div class="timeline">
            <div class="track">
              <i :style="{ left: openPct + '%', width: spanPct + '%' }" />
              <b class="late-mark" :style="{ left: latePct + '%' }" />
            </div>
            <div class="scale">
              <span>00:00</span>
              <span>12:00</span>
              <span>24:00</span>
            </div>
          </div>
          <p v-if="hoursInvalid" class="warn">Giờ đóng cửa cần sau giờ mở cửa.</p>

          <div class="times">
            <label class="control">
              <span>Mở cửa</span>
              <input v-model="form.openTime" type="time" />
              <small>{{ clock(form.openTime) }} · suất sớm nhất</small>
            </label>
            <label class="control">
              <span>Suất tối từ</span>
              <input v-model="form.lateShowAfter" type="time" />
              <small>{{ clock(form.lateShowAfter) }} · bắt đầu phụ thu</small>
            </label>
            <label class="control">
              <span>Đóng cửa</span>
              <input v-model="form.closeTime" type="time" />
              <small>{{ clock(form.closeTime) }} · suất muộn nhất</small>
            </label>
          </div>
        </section>
      </div>

      <section class="card stock">
        <div>
          <h3>Cảnh báo bắp nước</h3>
          <p>Dashboard hiện cảnh báo khi một món còn ít hơn hoặc bằng mức này.</p>
        </div>
        <label class="control stock-control">
          <span>Ngưỡng tồn</span>
          <div class="input-wrap">
            <input v-model.number="form.lowStockAlert" type="number" min="0" />
            <em>phần</em>
          </div>
        </label>
      </section>

      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 1.15rem; }
.head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; }
.kicker {
  margin: 0 0 0.3rem;
  color: #fca5a5;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h2 { margin: 0; font-size: 1.55rem; }
.sub, .state { margin: 0.35rem 0 0; color: var(--text-muted); }
.save {
  background: #e50914;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.15rem;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
}
.save:disabled { opacity: 0.6; cursor: default; }
.stack { display: grid; gap: 1rem; }
.summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}
.summary article, .card {
  background: #141414;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
}
.summary article { padding: 0.9rem 1rem; display: grid; gap: 0.25rem; }
.summary span, .control span, .examples span {
  color: var(--text-muted);
  font-size: 0.75rem;
}
.summary strong { font-size: 1.05rem; }
.layout { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1rem; align-items: start; }
.card { padding: 1.15rem; display: grid; gap: 0.95rem; }
.card-head h3, .stock h3 { margin: 0; font-size: 1.05rem; }
.card-head p, .stock p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.control { display: grid; gap: 0.4rem; }
.input-wrap { position: relative; }
.input-wrap em {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-style: normal;
  font-size: 0.8rem;
}
input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: #0b0b0b;
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  color-scheme: dark;
}
.input-wrap input { padding-right: 4.5rem; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.examples {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}
.examples div {
  padding: 0.7rem 0.75rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  display: grid;
  gap: 0.2rem;
}
.examples b { font-size: 0.95rem; }
.examples .peak { background: rgba(251,191,36,0.1); }
.examples .peak b { color: #fbbf24; }
.timeline { display: grid; gap: 0.4rem; }
.track {
  position: relative;
  height: 10px;
  border-radius: 99px;
  background: rgba(255,255,255,0.08);
}
.track i {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 99px;
  background: linear-gradient(90deg, #e50914, #fbbf24);
}
.late-mark {
  position: absolute;
  top: -4px;
  width: 2px;
  height: 18px;
  background: #fbbf24;
  transform: translateX(-1px);
}
.scale, .times { display: flex; justify-content: space-between; gap: 0.75rem; }
.scale { color: #6b7280; font-size: 0.72rem; }
.times { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.times small { color: var(--text-muted); font-size: 0.75rem; }
.warn, .error { margin: 0; color: #fca5a5; }
.stock {
  grid-template-columns: 1fr 240px;
  align-items: center;
}
@media (max-width: 1100px) {
  .summary, .examples { grid-template-columns: 1fr 1fr; }
  .layout, .stock { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .head { flex-direction: column; align-items: stretch; }
  .summary, .split, .examples, .times { grid-template-columns: 1fr; }
}
</style>
