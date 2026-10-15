<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../api'

const showtimes = ref([])
const movies = ref([])
const loading = ref(true)
const error = ref('')
const selectedDay = ref('')

onMounted(async () => {
  try {
    const [shows, movieList] = await Promise.all([
      apiFetch('/api/showtimes'),
      apiFetch('/api/Movies').catch(() => []),
    ])
    showtimes.value = Array.isArray(shows) ? shows : []
    movies.value = Array.isArray(movieList) ? movieList : []
    if (days.value.length) selectedDay.value = days.value[0].key
  } catch (e) {
    error.value = e.message || 'Không tải được lịch chiếu'
  } finally {
    loading.value = false
  }
})

function dayKey(value) {
  const date = new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const movieById = computed(() => {
  const map = new Map()
  for (const movie of movies.value) map.set(movie.id, movie)
  return map
})

const days = computed(() => {
  const groups = new Map()
  for (const show of showtimes.value) {
    const key = dayKey(show.startTime)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(show)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, shows]) => {
      const [year, month, day] = key.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return {
        key,
        weekday: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        dateLabel: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        full: date.toLocaleDateString('vi-VN', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        count: shows.length,
      }
    })
})

const selected = computed(() => days.value.find((day) => day.key === selectedDay.value) || null)

const movieCards = computed(() => {
  if (!selected.value) return []
  const shows = showtimes.value.filter((show) => dayKey(show.startTime) === selected.value.key)
  const groups = new Map()
  for (const show of shows) {
    if (!groups.has(show.movieId)) {
      const movie = movieById.value.get(show.movieId)
      groups.set(show.movieId, {
        id: show.movieId,
        title: movie?.title || show.movieTitle,
        posterUrl: movie?.posterUrl || '',
        genre: movie?.genre || '',
        duration: movie?.duration || 0,
        shows: [],
      })
    }
    groups.get(show.movieId).shows.push(show)
  }
  for (const card of groups.values()) {
    card.shows.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  }
  return [...groups.values()]
})

function formatTime(value) {
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function posterFallback(id) {
  const gradients = [
    'linear-gradient(160deg, #1e3a8a, #0f172a)',
    'linear-gradient(160deg, #7c2d12, #0f172a)',
    'linear-gradient(160deg, #14532d, #0f172a)',
    'linear-gradient(160deg, #581c87, #0f172a)',
  ]
  return gradients[(Number(id) || 1) % gradients.length]
}
</script>

<template>
  <section class="schedule">
    <header class="schedule-head">
      <p class="kicker">NATIONAL CINEMA</p>
      <h1>Lịch chiếu</h1>
      <p class="lead">
        Chọn ngày, rồi chọn giờ. Mỗi đơn tối đa 8 ghế, ghế được giữ trong 10 phút. Giá vé online 75.000đ.
      </p>
    </header>

    <p v-if="loading" class="state">Đang tải lịch chiếu...</p>
    <p v-else-if="error" class="state">{{ error }}</p>
    <p v-else-if="!days.length" class="state">Không còn suất chiếu sắp tới.</p>

    <template v-else>
      <div class="day-strip" role="tablist" aria-label="Chọn ngày chiếu">
        <button
          v-for="day in days"
          :key="day.key"
          type="button"
          class="day-btn"
          :class="{ active: day.key === selectedDay }"
          role="tab"
          :aria-selected="day.key === selectedDay"
          @click="selectedDay = day.key"
        >
          <span class="dow">{{ day.weekday }}</span>
          <span class="dom">{{ day.dateLabel }}</span>
          <span class="count">{{ day.count }} suất</span>
        </button>
      </div>

      <p v-if="selected" class="day-title">{{ selected.full }}</p>

      <article v-for="movie in movieCards" :key="movie.id" class="movie-card">
        <div class="poster" :style="movie.posterUrl ? undefined : { background: posterFallback(movie.id) }">
          <img v-if="movie.posterUrl" :src="movie.posterUrl" :alt="movie.title" />
          <span v-else>🎬</span>
        </div>
        <div class="movie-body">
          <div class="movie-top">
            <h2>{{ movie.title }}</h2>
            <p class="meta">
              <span v-if="movie.genre">{{ movie.genre }}</span>
              <span v-if="movie.duration">{{ movie.duration }} phút</span>
              <span>2D</span>
            </p>
          </div>
          <div class="times">
            <router-link
              v-for="show in movie.shows"
              :key="show.id"
              class="time-chip"
              :to="{ path: '/book', query: { showTimeId: show.id } }"
            >
              <strong>{{ formatTime(show.startTime) }}</strong>
              <span>{{ show.roomName }}</span>
            </router-link>
          </div>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.schedule {
  width: min(980px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2.25rem 0 4rem;
}
.schedule-head { margin-bottom: 1.5rem; }
.kicker {
  margin: 0 0 0.35rem;
  color: var(--accent-gold);
  letter-spacing: 0.16em;
  font-size: 0.75rem;
  font-weight: 700;
}
h1 {
  margin: 0 0 0.45rem;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  letter-spacing: -0.03em;
}
.lead {
  margin: 0;
  max-width: 62ch;
  color: var(--text-secondary);
  line-height: 1.6;
}
.state { color: var(--text-muted); }

.day-strip {
  display: flex;
  gap: 0.65rem;
  overflow-x: auto;
  padding-bottom: 0.35rem;
  margin-bottom: 1.25rem;
}
.day-btn {
  min-width: 96px;
  padding: 0.7rem 0.75rem 0.6rem;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  box-shadow: var(--shadow-card);
}
.day-btn.active {
  background: var(--accent-red);
  border-color: transparent;
  color: #fff;
}
.dow {
  display: block;
  font-size: 0.72rem;
  text-transform: capitalize;
  opacity: 0.85;
}
.dom {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.count {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.7rem;
  opacity: 0.8;
}
.day-title {
  margin: 0 0 0.9rem;
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: capitalize;
}

.movie-card {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 1.1rem;
  padding: 1rem;
  margin-bottom: 0.9rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
}
.poster {
  width: 112px;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f2937;
  font-size: 2rem;
}
.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.movie-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
h2 {
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}
.meta span {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--hover-fill);
}
.times {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.9rem;
}
.time-chip {
  min-width: 88px;
  padding: 0.5rem 0.7rem;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  background: var(--bg-primary);
  color: var(--text-primary);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.time-chip strong {
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}
.time-chip span {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.time-chip:hover {
  border-color: var(--accent-red);
  color: var(--accent-red);
}

@media (max-width: 640px) {
  .movie-card { grid-template-columns: 84px 1fr; gap: 0.8rem; }
  .poster { width: 84px; }
}
</style>
