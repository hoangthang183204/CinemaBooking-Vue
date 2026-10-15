<script setup>
import { ref, onMounted } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { apiFetch } from '../../api'

const stats = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stats.value = await apiFetch('/api/staff/dashboard')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫'
}

function statusLabel(s) {
  const map = { Paid: 'Đã TT', Pending: 'Chờ TT', Cancelled: 'Đã hủy', Refunded: 'Chờ hoàn', RefundCompleted: 'Đã hoàn' }
  return map[s] || s
}
</script>

<template>
  <div class="dashboard">
    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else-if="stats">
      <div class="stats-grid">
        <div class="stat-card highlight">
          <div class="stat-icon">
            <AppIcon name="money" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Doanh thu hôm nay</span>
            <span class="stat-value">{{ formatMoney(stats.totalRevenue) }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="ticket" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Tổng đơn</span>
            <span class="stat-value">{{ stats.totalBookings }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="check" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Đã thanh toán</span>
            <span class="stat-value">{{ stats.paidBookings }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="clock" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Chờ thanh toán</span>
            <span class="stat-value">{{ stats.pendingBookings }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">Đơn đặt gần đây</h3>
          <router-link to="/staff/bookings" class="panel-link">Xem tất cả →</router-link>
        </div>
        <div v-if="!stats.recentBookings?.length" class="empty">
          Chưa có đơn nào
        </div>
        <div v-else class="booking-list">
          <div v-for="b in stats.recentBookings" :key="b.id" class="booking-row">
            <div class="booking-main">
              <span class="booking-id">#{{ b.id }}</span>
              <div>
                <div class="booking-movie">{{ b.movieTitle }}</div>
                <div class="booking-email">{{ b.userEmail }}</div>
              </div>
            </div>
            <div class="booking-meta">
              <span class="status-pill" :class="String(b.status || '').toLowerCase()">
                {{ statusLabel(b.status) }}
              </span>
              <span class="booking-price">{{ formatMoney(b.totalPrice) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 1.5rem; }

.state {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 3rem; color: var(--text-muted);
}
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}
.stat-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}
.stat-card.highlight {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.08));
  border-color: rgba(59, 130, 246, 0.3);
}
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  flex-shrink: 0;
}
.stat-info { display: flex; flex-direction: column; gap: 0.15rem; }
.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.stat-card.highlight .stat-value {
  color: #93c5fd;
  font-size: 1.35rem;
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.panel-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.panel-link {
  font-size: 0.8rem;
  color: #93c5fd;
  text-decoration: none;
  font-weight: 600;
}
.panel-link:hover { text-decoration: underline; }

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.booking-list { display: flex; flex-direction: column; gap: 0.5rem; }
.booking-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  gap: 1rem;
  flex-wrap: wrap;
}
.booking-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 200px;
}
.booking-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--accent-gold);
  font-weight: 700;
}
.booking-movie {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
}
.booking-email {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
.booking-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}
.booking-price {
  font-weight: 700;
  color: var(--accent-gold);
  font-size: 0.85rem;
}
.status-pill {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status-pill.pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; }
.status-pill.paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-pill.cancelled, .status-pill.refunded { background: rgba(248, 113, 113, 0.15); color: #f87171; }
.status-pill.refundcompleted { background: rgba(56, 189, 248, 0.16); color: #38bdf8; }
</style>