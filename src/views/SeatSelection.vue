<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SeatMap from '../components/SeatMap.vue'
import { apiFetch } from '../api'

const route = useRoute()
const showTimes = ref([])
const selectedShowTimeId = ref(null)
const roomSeats = ref(null)
const loading = ref(false)
const error = ref('')

const fromQuery = computed(() => {
  const v = Number(route.query.showTimeId)
  return Number.isFinite(v) && v > 0 ? v : null
})

const movieId = computed(() => {
  const fromUrl = Number(route.query.movieId)
  if (Number.isFinite(fromUrl) && fromUrl > 0) return fromUrl
  const current = showTimes.value.find((s) => s.id === selectedShowTimeId.value)
  return current?.movieId || null
})

const movieShowTimes = computed(() => {
  if (!movieId.value) return showTimes.value
  return showTimes.value.filter((st) => st.movieId === movieId.value)
})

const selectedShowTime = computed(() =>
  movieShowTimes.value.find((s) => s.id === selectedShowTimeId.value)
)

async function fetchShowTimes() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch('/api/showtimes')
    showTimes.value = Array.isArray(data) ? data : []
    const choices = movieId.value
      ? showTimes.value.filter((st) => st.movieId === movieId.value)
      : showTimes.value

    if (choices.length) {
      const fromUrl = fromQuery.value
      const exists = fromUrl && choices.some((s) => s.id === fromUrl)
      if (!selectedShowTimeId.value || !choices.some((s) => s.id === selectedShowTimeId.value)) {
        selectedShowTimeId.value = exists ? fromUrl : choices[0].id
      }
    }
  } catch (e) {
    error.value =
      e.message || 'Lỗi kết nối API. Kiểm tra CORS và URL trong config.js.'
  } finally {
    loading.value = false
  }
}

async function fetchRoomSeats(silent = false) {
  if (!selectedShowTimeId.value) {
    roomSeats.value = null
    return
  }
  if (!silent) loading.value = true
  error.value = ''
  try {
    const data = await apiFetch(
      `/api/showtimes/${selectedShowTimeId.value}/room-seats`
    )
    roomSeats.value = data
  } catch (e) {
    if (e.status === 404) {
      roomSeats.value = null
      error.value = 'Không tìm thấy sơ đồ ghế cho suất này.'
    } else {
      error.value = e.message || 'Lỗi tải sơ đồ ghế'
      roomSeats.value = null
    }
  } finally {
    loading.value = false
  }
}

function onShowTimeChange() {
  fetchRoomSeats()
}

function formatShowTime(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

let pollTimer = null

onMounted(() => {
  if (fromQuery.value) selectedShowTimeId.value = fromQuery.value
  fetchShowTimes()
  pollTimer = setInterval(() => fetchRoomSeats(true), 15000)
})

onUnmounted(() => clearInterval(pollTimer))

watch(selectedShowTimeId, () => {
  fetchRoomSeats()
})
</script>

<template>
  <div class="seat-selection">
    <div class="top-bar">
      <router-link to="/" class="back-link">← Về trang chủ</router-link>
    </div>

    <!-- Showtime picker -->
    <section class="panel">
      <div class="panel-head">
        <h2 class="panel-title">Chọn suất chiếu</h2>
        <span v-if="selectedShowTime" class="panel-badge">
          {{ selectedShowTime.roomName }}
        </span>
      </div>

      <div v-if="loading && !showTimes.length" class="state">
        <div class="spinner" />
        <p>Đang tải...</p>
      </div>

      <p v-else-if="error && !roomSeats" class="state error">{{ error }}</p>

      <div v-else-if="movieShowTimes.length" class="showtime-picker">
        <select
          v-model.number="selectedShowTimeId"
          class="select"
          @change="onShowTimeChange"
        >
          <option v-for="st in movieShowTimes" :key="st.id" :value="st.id">
            {{ st.roomName }} — {{ formatShowTime(st.startTime) }}
          </option>
        </select>

        <p v-if="selectedShowTime" class="selected-info">
          <strong>{{ selectedShowTime.movieTitle }}</strong>
          <span class="dot-sep">•</span>
          {{ formatShowTime(selectedShowTime.startTime) }}
        </p>
      </div>

      <p v-else class="state">Không còn suất chiếu sắp tới.</p>
    </section>

    <!-- Seat map -->
    <section v-if="selectedShowTimeId && roomSeats" class="panel panel-seatmap">
      <div class="panel-head">
        <h2 class="panel-title">
          {{ roomSeats.roomName }} — Sơ đồ ghế
        </h2>
        <span class="seat-count">
          {{ roomSeats.seats?.length || 0 }} ghế
        </span>
      </div>

      <SeatMap :seats="roomSeats.seats" :show-time-id="selectedShowTimeId" />
    </section>

    <section v-else-if="selectedShowTimeId && !loading" class="panel">
      <p class="state">{{ error || 'Không có dữ liệu ghế cho suất này.' }}</p>
    </section>
  </div>
</template>

<style scoped>
.seat-selection {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.top-bar { margin-bottom: 0.5rem; }
.back-link {
  display: inline-block;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}
.back-link:hover { color: var(--text-primary); }

/* Panel */
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}
.panel-seatmap {
  padding: 1.5rem 1rem;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.panel-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.panel-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  font-size: 0.75rem;
  font-weight: 600;
}
.seat-count {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Showtime picker */
.showtime-picker {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.select {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  transition: border-color 0.2s;
}
.select:hover { border-color: rgba(255, 255, 255, 0.3); }
.select:focus {
  outline: none;
  border-color: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
}
.select option {
  background: #1a1a1a;
  color: var(--text-primary);
}

.selected-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  padding: 0.65rem 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid var(--accent-red);
  border-radius: 6px;
}
.selected-info strong { color: var(--text-primary); }
.dot-sep { margin: 0 0.4rem; color: var(--text-dim); }

/* State */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  color: var(--text-muted);
  text-align: center;
}
.state.error { color: #f87171; }
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent-red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .seat-selection { padding: 1rem; }
  .panel { padding: 1rem; }
  .panel-seatmap { padding: 1rem 0.5rem; }
}
</style>