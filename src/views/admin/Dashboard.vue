<script setup>
import { ref, onMounted } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { apiFetch } from '../../api'

const stats = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stats.value = await apiFetch('/api/admin/dashboard')
  } catch (e) {
    error.value = e.message || 'Không tải được thống kê'
  } finally {
    loading.value = false
  }
})

function formatMoney(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫'
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN')
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
      <p>Đang tải thống kê...</p>
    </div>

    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else-if="stats">
      <div class="stats-grid">
        <div class="stat-card stat-revenue">
          <div class="stat-icon">
            <AppIcon name="money" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Tổng doanh thu</span>
            <span class="stat-value">{{ formatMoney(stats.totalRevenue) }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="ticket" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Đơn đặt vé</span>
            <span class="stat-value">{{ stats.totalBookings }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="users" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Người dùng</span>
            <span class="stat-value">{{ stats.totalUsers }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="movie" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Phim</span>
            <span class="stat-value">{{ stats.totalMovies }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="room" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Phòng chiếu</span>
            <span class="stat-value">{{ stats.totalRooms }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <AppIcon name="clock" :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">Suất chiếu</span>
            <span class="stat-value">{{ stats.totalShowTimes }}</span>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">Đơn đặt gần đây</h3>
            <router-link to="/admin/bookings" class="panel-link">Xem tất cả →</router-link>
          </div>
          <div v-if="!stats.recentBookings?.length" class="empty">
            Chưa có đơn đặt nào
          </div>
          <div v-else class="booking-list">
            <div
              v-for="b in stats.recentBookings"
              :key="b.id"
              class="booking-row"
            >
              <div class="booking-main">
                <span class="booking-id">#{{ b.id }}</span>
                <span class="booking-movie">{{ b.movieTitle }}</span>
              </div>
              <div class="booking-meta">
                <span class="booking-email">{{ b.userEmail }}</span>
                <span
                  class="status-pill"
                  :class="String(b.status || '').toLowerCase()"
                >
                  {{ statusLabel(b.status) }}
                </span>
                <span class="booking-price">{{ formatMoney(b.totalPrice) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">Top phim bán chạy</h3>
          </div>
          <div v-if="!stats.topMovies?.length" class="empty">
            Chưa có dữ liệu
          </div>
          <div v-else class="top-movies">
            <div
              v-for="(m, idx) in stats.topMovies"
              :key="m.movieId"
              class="top-movie-row"
            >
              <span class="rank" :class="`rank-${idx + 1}`">{{ idx + 1 }}</span>
              <div class="movie-info">
                <span class="movie-title">{{ m.title }}</span>
                <span class="movie-sub">{{ m.bookingCount }} đơn đặt</span>
              </div>
              <span class="movie-revenue">{{ formatMoney(m.revenue) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-row">
        <div class="summary-card paid">
          <span class="summary-label">Đã thanh toán</span>
          <span class="summary-value">{{ stats.paidBookings }}</span>
        </div>
        <div class="summary-card pending">
          <span class="summary-label">Chờ thanh toán</span>
          <span class="summary-value">{{ stats.pendingBookings }}</span>
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
  border-top-color: var(--accent-red);
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
.stat-revenue {
  background: linear-gradient(135deg, rgba(229, 9, 20, 0.15), rgba(251, 191, 36, 0.08));
  border-color: rgba(229, 9, 20, 0.3);
}
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fca5a5;
  flex-shrink: 0;
}
.stat-revenue .stat-icon {
  background: rgba(229, 9, 20, 0.15);
  border-color: rgba(229, 9, 20, 0.35);
  color: var(--accent-gold);
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
.stat-revenue .stat-value {
  color: var(--accent-gold);
  font-size: 1.35rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 1rem;
}
@media (max-width: 992px) {
  .content-grid { grid-template-columns: 1fr; }
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
  color: #fca5a5;
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
  padding: 0.75rem;
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
  min-width: 150px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.booking-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}
.booking-email { color: var(--text-muted); }
.booking-price {
  font-weight: 700;
  color: var(--accent-gold);
  font-size: 0.85rem;
}

.top-movies { display: flex; flex-direction: column; gap: 0.5rem; }
.top-movie-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}
.rank {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  flex-shrink: 0;
}
.rank-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #fff; }
.rank-2 { background: linear-gradient(135deg, #cbd5e1, #94a3b8); color: #0a0a0a; }
.rank-3 { background: linear-gradient(135deg, #cd7f32, #a0522d); color: #fff; }
.movie-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.movie-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.movie-sub { font-size: 0.75rem; color: var(--text-muted); }
.movie-revenue {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-gold);
}

.summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.summary-card {
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid;
}
.summary-card.paid {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.3);
}
.summary-card.pending {
  background: rgba(234, 179, 8, 0.08);
  border-color: rgba(234, 179, 8, 0.3);
}
.summary-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}
.summary-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
}
.summary-card.paid .summary-value { color: #22c55e; }
.summary-card.pending .summary-value { color: #fbbf24; }
</style>