<script setup>
import { onMounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { apiFetch } from '../../api'

const today = new Date()
const iso = (d) => d.toISOString().slice(0, 10)
const from = ref(iso(new Date(today.getTime() - 13 * 86400000)))
const to = ref(iso(today))
const groupBy = ref('movie')
const report = ref(null)
const loading = ref(false)
const error = ref('')
const exporting = ref(false)

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await apiFetch(`/api/admin/reports?from=${from.value}&to=${to.value}&groupBy=${groupBy.value}`)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function exportExcel() {
  exporting.value = true
  try {
    const token = localStorage.getItem('cb_token')
    const res = await fetch(`/api/admin/reports/excel?from=${from.value}&to=${to.value}&groupBy=${groupBy.value}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Không xuất được file')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bao-cao-${from.value}-${to.value}.xls`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message
  } finally {
    exporting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Báo cáo & thống kê</h2>
        <p class="page-sub">Doanh thu đã thanh toán theo phim, phòng hoặc khung giờ. Xuất Excel để đối soát.</p>
      </div>
      <button class="btn btn-primary" type="button" :disabled="exporting" @click="exportExcel">
        <AppIcon name="printer" :size="16" /> {{ exporting ? 'Đang xuất...' : 'Xuất Excel' }}
      </button>
    </div>

    <form class="filters" @submit.prevent="load">
      <label>Từ ngày<input v-model="from" type="date" /></label>
      <label>Đến ngày<input v-model="to" type="date" /></label>
      <label>
        Nhóm theo
        <select v-model="groupBy">
          <option value="movie">Phim</option>
          <option value="room">Phòng</option>
          <option value="hour">Khung giờ</option>
        </select>
      </label>
      <button class="btn btn-primary" type="submit">Xem báo cáo</button>
    </form>

    <p v-if="loading" class="state">Đang tải...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else-if="report">
      <div class="totals">
        <div><span>Doanh thu</span><strong>{{ formatMoney(report.totalRevenue) }}</strong></div>
        <div><span>Số đơn</span><strong>{{ report.totalBookings }}</strong></div>
        <div><span>Số ghế</span><strong>{{ report.totalSeats }}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>{{ groupBy === 'room' ? 'Phòng' : groupBy === 'hour' ? 'Khung giờ' : 'Phim' }}</th>
            <th>Đơn</th>
            <th>Ghế</th>
            <th>Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!report.rows?.length">
            <td colspan="4" class="state">Không có đơn đã thanh toán trong khoảng này.</td>
          </tr>
          <tr v-for="row in report.rows" :key="row.label">
            <td>{{ row.label }}</td>
            <td>{{ row.bookings }}</td>
            <td>{{ row.seats }}</td>
            <td>{{ formatMoney(row.revenue) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1rem; }
.page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.page-title { margin: 0; }
.page-sub, .state { color: var(--text-muted); }
.state.error { color: #fca5a5; }
.filters {
  display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end;
  background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1rem;
}
.filters label { display: grid; gap: 0.35rem; color: #cbd5e1; font-size: 0.85rem; }
.filters input, .filters select {
  padding: 0.6rem 0.75rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14);
  background: #0b0b0b; color: #fff; font-family: inherit;
}
.btn {
  display: inline-flex; align-items: center; gap: 0.35rem; height: 40px;
  border: none; border-radius: 8px; padding: 0 0.9rem; cursor: pointer; font-family: inherit; color: #fff;
}
.btn-primary { background: var(--accent-red); }
.totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
.totals div {
  background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1rem;
  display: grid; gap: 0.2rem;
}
.totals span { color: var(--text-muted); font-size: 0.8rem; }
.totals strong { font-size: 1.25rem; color: var(--accent-gold); }
table { width: 100%; border-collapse: collapse; background: #141414; border-radius: 14px; overflow: hidden; }
th, td { text-align: left; padding: 0.8rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
th { color: var(--text-muted); font-size: 0.8rem; }
@media (max-width: 700px) { .totals { grid-template-columns: 1fr; } }
</style>
