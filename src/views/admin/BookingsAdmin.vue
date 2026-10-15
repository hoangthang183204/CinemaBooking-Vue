<script setup>
import { ref, onMounted, computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import AdminPager from '../../components/AdminPager.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'

const toast = useToast()

const list = ref([])
const loading = ref(true)
const error = ref('')
const filter = ref('all')

const filtered = computed(() => {
  if (filter.value === 'all') return list.value
  return list.value.filter(
    (b) => b.status.toLowerCase() === filter.value
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
    const data = await apiFetch('/api/admin/bookings')
    list.value = data ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function cancelBooking(b) {
  const message = b.status === 'Paid'
    ? `Hủy đơn #${b.id} đã thu tiền? Cần hoàn ${formatMoney(b.totalPrice)} cho khách.`
    : `Hủy đơn #${b.id}? Ghế và bắp nước được trả lại.`
  if (!confirm(message)) return
  try {
    await apiFetch(`/api/admin/bookings/${b.id}/cancel`, { method: 'POST' })
    await fetchList()
    toast.success(`Đã hủy đơn #${b.id}`)
  } catch (e) {
    toast.error('Không thể hủy: ' + e.message)
  }
}

async function completeRefund(b) {
  const money = formatMoney(b.totalPrice)
  if (!confirm(`Xác nhận đã trả ${money} tiền mặt cho khách của đơn #${b.id}?`)) return
  try {
    await apiFetch(`/api/admin/bookings/${b.id}/refund`, { method: 'POST' })
    toast.success(`Đã hoàn ${money} cho đơn #${b.id}`)
    await fetchList()
  } catch (e) {
    toast.error(e.message || 'Không hoàn được tiền')
  }
}

async function markPaid(b) {
  if (!confirm(`Đánh dấu đơn #${b.id} là ĐÃ THANH TOÁN?`)) return
  try {
    await apiFetch(`/api/admin/bookings/${b.id}/mark-paid`, { method: 'POST' })
    await fetchList()
    toast.success(`Đã đánh dấu đơn #${b.id} là đã thanh toán`)
  } catch (e) {
    toast.error('Lỗi: ' + e.message)
  }
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫'
}

function statusLabel(s) {
  const map = { Paid: 'Đã TT', Pending: 'Chờ TT', Cancelled: 'Đã hủy', Refunded: 'Chờ hoàn', RefundCompleted: 'Đã hoàn' }
  return map[s] || s
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Quản lý đơn đặt vé</h2>
        <p class="page-sub">{{ list.length }} đơn đặt trong hệ thống</p>
      </div>
    </div>

    <div class="filter-tabs">
      <button
        class="filter-tab"
        :class="{ active: filter === 'all' }"
        @click="filter = 'all'"
      >
        Tất cả
        <span class="count-badge">{{ counts.all }}</span>
      </button>
      <button
        class="filter-tab"
        :class="{ active: filter === 'pending' }"
        @click="filter = 'pending'"
      >
        Chờ thanh toán
        <span class="count-badge warning">{{ counts.pending }}</span>
      </button>
      <button
        class="filter-tab"
        :class="{ active: filter === 'paid' }"
        @click="filter = 'paid'"
      >
        Đã thanh toán
        <span class="count-badge success">{{ counts.paid }}</span>
      </button>
      <button
        class="filter-tab"
        :class="{ active: filter === 'cancelled' }"
        @click="filter = 'cancelled'"
      >
        Đã hủy
        <span class="count-badge danger">{{ counts.cancelled }}</span>
      </button>
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
            <th style="width:120px">Phòng</th>
            <th style="width:160px">Suất chiếu</th>
            <th style="width:120px">Ghế</th>
            <th style="width:120px">Tổng tiền</th>
            <th style="width:130px">Trạng thái</th>
            <th style="width:120px">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in pageItems" :key="b.id">
            <td class="cell-id">#{{ b.id }}</td>
            <td>
              <div class="email-cell">{{ b.userEmail }}</div>
            </td>
            <td>
              <div class="cell-title">{{ b.movieTitle }}</div>
            </td>
            <td>
              <span class="room-tag">{{ b.roomName }}</span>
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
            <td>
              <div class="actions">
                <button
                  v-if="b.status === 'Pending'"
                  class="btn-icon success"
                  title="Đánh dấu đã thanh toán"
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

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.4rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  width: fit-content;
}
.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
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
  background: var(--accent-red);
  color: #fff;
}
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.7rem;
  font-weight: 700;
}
.filter-tab.active .count-badge {
  background: rgba(255, 255, 255, 0.25);
}
.count-badge.warning { background: rgba(234, 179, 8, 0.2); color: #fbbf24; }
.count-badge.success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.count-badge.danger { background: rgba(248, 113, 113, 0.2); color: #f87171; }
.filter-tab.active .count-badge.warning,
.filter-tab.active .count-badge.success,
.filter-tab.active .count-badge.danger {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.state { padding: 3rem; text-align: center; color: var(--text-muted); }
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-red);
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

.email-cell {
  font-size: 0.8rem;
  color: var(--text-muted);
  word-break: break-all;
  max-width: 200px;
}

.room-tag {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
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
</style>