<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch } from '../api'

const route = useRoute()
const router = useRouter()
const movieId = computed(() => Number(route.params.id))
const movie = ref(null)
const showTimes = ref([])
const loading = ref(true)
const error = ref('')
const creating = ref(false)
const showSection = ref(null)
const trailerOpen = ref(false)
const descOpen = ref(false)

onMounted(async () => {
  try {
    const [list, all] = await Promise.all([
      apiFetch('/api/Movies'),
      apiFetch('/api/showtimes'),
    ])
    movie.value = (list || []).find((m) => m.id === movieId.value) || null
    showTimes.value = (all || []).filter((st) => st.movieId === movieId.value)
  } catch (e) {
    error.value = e.message || 'Lỗi'
  } finally {
    loading.value = false
  }
})

const genres = computed(() =>
  String(movie.value?.genre || '')
    .split(/[,/]/)
    .map((item) => item.trim())
    .filter(Boolean)
)

const castList = computed(() =>
  String(movie.value?.cast || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
)

const trailerId = computed(() => {
  const url = movie.value?.trailerUrl || ''
  const match = String(url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)
  return match ? match[1] : ''
})

const description = computed(() => movie.value?.description || 'Chọn suất chiếu phù hợp với bạn bên dưới và tiến hành chọn ghế.')
const descriptionLong = computed(() => description.value.length > 220)

function scrollToShows() {
  showSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToSeatSelection(showTimeId) {
  router.push({ path: '/book', query: { showTimeId, movieId: movieId.value } })
}

async function createDefaultShowTimes() {
  if (!movieId.value || creating.value) return
  creating.value = true
  error.value = ''
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const slots = [
      { roomId: 1, hour: 19, minute: 0 },
      { roomId: 2, hour: 21, minute: 0 },
    ]
    for (const slot of slots) {
      const start = new Date(tomorrow)
      start.setHours(slot.hour, slot.minute, 0, 0)
      await apiFetch('/api/showtimes', {
        method: 'POST',
        body: JSON.stringify({
          movieId: movieId.value,
          roomId: slot.roomId,
          startTime: start.toISOString(),
        }),
      })
    }
    const all = await apiFetch('/api/showtimes')
    showTimes.value = (all || []).filter((st) => st.movieId === movieId.value)
  } catch (e) {
    error.value = e.message || 'Lỗi khi tạo suất chiếu'
  } finally {
    creating.value = false
  }
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatRelease(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN')
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })
}

// Fallback gradient nếu không có poster
function getPosterGradient(id) {
  const gradients = [
    'linear-gradient(145deg, #1e3a8a, #0f172a)',
    'linear-gradient(145deg, #7c2d12, #0f172a)',
    'linear-gradient(145deg, #14532d, #0f172a)',
    'linear-gradient(145deg, #581c87, #0f172a)',
    'linear-gradient(145deg, #831843, #0f172a)',
  ]
  return gradients[((id || 1) - 1) % gradients.length]
}
</script>

<template>
  <div class="page">
    <router-link to="/" class="back-link">← Về trang chủ</router-link>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>

    <template v-else>
      <section class="movie-hero" :style="movie?.posterUrl ? { backgroundImage: `url(${movie.posterUrl})` } : undefined">
        <div class="movie-hero-shade" />
        <header class="movie-header">
          <div class="movie-poster-large">
            <img
              v-if="movie?.posterUrl"
              :src="movie.posterUrl"
              :alt="movie.title"
              class="poster-img-large"
            />
            <span v-else class="poster-icon-large">🎬</span>
          </div>
          <div class="movie-info">
            <h1 class="movie-title">{{ movie?.title || 'Phim' }}</h1>
            <div class="movie-tags">
              <span class="tag">P13</span>
              <span class="tag tag-outline">2D</span>
              <span class="tag tag-outline">{{ movie?.duration }} phút</span>
              <span v-if="movie?.rating" class="tag tag-score">{{ Number(movie.rating).toFixed(1) }}</span>
            </div>
            <div v-if="genres.length" class="chips">
              <span v-for="genre in genres" :key="genre">{{ genre }}</span>
            </div>
            <ul class="facts">
              <li v-if="movie?.releaseDate"><span>Khởi chiếu</span>{{ formatRelease(movie.releaseDate) }}</li>
              <li v-if="movie?.country"><span>Quốc gia</span>{{ movie.country }}</li>
              <li v-if="movie?.language"><span>Ngôn ngữ</span>{{ movie.language }}</li>
              <li v-if="movie?.director"><span>Đạo diễn</span>{{ movie.director }}</li>
            </ul>
            <div v-if="castList.length" class="cast">
              <span v-for="name in castList" :key="name" class="cast-person">
                <i>{{ name.charAt(0) }}</i>
                {{ name }}
              </span>
            </div>
            <p class="movie-desc" :class="{ clamped: descriptionLong && !descOpen }">{{ description }}</p>
            <button v-if="descriptionLong" type="button" class="more" @click="descOpen = !descOpen">
              {{ descOpen ? 'Thu gọn' : 'Xem thêm' }}
            </button>
            <div class="hero-actions">
              <button type="button" class="btn-book" @click="scrollToShows">Đặt vé ngay</button>
              <button v-if="trailerId" type="button" class="btn-trailer" @click="trailerOpen = true">Xem trailer</button>
            </div>
          </div>
        </header>
      </section>

      <section ref="showSection" class="showtimes-section">
        <h2 class="section-title">Suất chiếu</h2>

        <p v-if="error" class="state error">{{ error }}</p>

        <div v-else-if="showTimes.length === 0" class="empty-state">
          <p>Chưa có suất chiếu cho phim này.</p>
          <button
            type="button"
            class="btn-primary"
            :disabled="creating"
            @click="createDefaultShowTimes"
          >
            {{ creating ? 'Đang tạo...' : '+ Tạo suất chiếu mẫu' }}
          </button>
        </div>

        <div v-else class="showtime-grid">
          <button
            v-for="st in showTimes"
            :key="st.id"
            type="button"
            class="showtime-card"
            @click="goToSeatSelection(st.id)"
          >
            <span class="showtime-time">{{ formatTime(st.startTime) }}</span>
            <span class="showtime-date">{{ formatDate(st.startTime) }}</span>
            <span class="showtime-room">{{ st.roomName }}</span>
            <span class="showtime-cta">Chọn ghế →</span>
          </button>
        </div>
      </section>
    </template>

    <div v-if="trailerOpen" class="trailer-back" @click.self="trailerOpen = false">
      <div class="trailer">
        <button type="button" class="trailer-close" @click="trailerOpen = false">Đóng</button>
        <iframe
          :src="`https://www.youtube.com/embed/${trailerId}?autoplay=1`"
          title="Trailer"
          allow="autoplay; encrypted-media"
          allowfullscreen
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 960px; margin: 0 auto; padding: 1.5rem; }
.back-link {
  display: inline-block;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  transition: color 0.2s;
}
.back-link:hover { color: var(--text-primary); }

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

.movie-hero {
  position: relative;
  margin-bottom: 2.5rem;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #111 center / cover no-repeat;
}
.movie-hero-shade {
  position: absolute;
  inset: 0;
  background: rgba(8, 8, 12, 0.72);
  backdrop-filter: blur(18px);
}
.movie-header {
  position: relative;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.75rem;
  padding: 1.5rem;
}
.movie-poster-large {
  aspect-ratio: 2/3;
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.poster-img-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.poster-icon-large {
  font-size: 4rem;
  opacity: 0.55;
}

.movie-info { display: flex; flex-direction: column; justify-content: center; }
.movie-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem;
  letter-spacing: -0.02em;
}
.movie-tags { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.tag {
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--accent-red);
  color: #fff;
}
.tag-outline {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
}
.movie-genre {
  color: #fca5a5;
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
  font-weight: 600;
}
.movie-director {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
}
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.8rem; }
.chips span {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(252, 165, 165, 0.15);
  color: #fecaca;
  font-size: 0.78rem;
  font-weight: 700;
}
.tag-score { background: #fbbf24; color: #111; }
.facts { list-style: none; margin: 0 0 0.8rem; padding: 0; display: grid; gap: 0.3rem; }
.facts li { color: var(--text-secondary); font-size: 0.9rem; }
.facts span { display: inline-block; min-width: 6.5rem; color: var(--text-muted); }
.cast { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-bottom: 0.8rem; }
.cast-person { display: flex; align-items: center; gap: 0.4rem; color: var(--text-secondary); font-size: 0.82rem; }
.cast-person i {
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center;
  background: #e50914; color: #fff; font-style: normal; font-weight: 800;
}
.movie-desc { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin: 0; }
.movie-desc.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.more {
  margin-top: 0.35rem;
  padding: 0;
  border: none;
  background: none;
  color: #fca5a5;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.hero-actions { display: flex; gap: 0.7rem; margin-top: 1rem; flex-wrap: wrap; }
.btn-book, .btn-trailer {
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.15rem;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.btn-book { background: #e50914; color: #fff; }
.btn-trailer { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.35); }
.trailer-back {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0,0,0,0.78);
  display: grid;
  place-items: center;
  padding: 1rem;
}
.trailer { width: min(920px, 100%); }
.trailer iframe { width: 100%; aspect-ratio: 16/9; border: 0; border-radius: 12px; background: #000; }
.trailer-close {
  margin-bottom: 0.5rem;
  border: none;
  background: #fff;
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

/* Showtimes */
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1.25rem;
}
.showtime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}
.showtime-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  padding: 1.1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  color: inherit;
  font-family: inherit;
}
.showtime-card:hover {
  border-color: var(--accent-red);
  background: var(--bg-card-hover);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card);
}
.showtime-time {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.showtime-date { font-size: 0.8rem; color: var(--text-muted); }
.showtime-room {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
  width: 100%;
}
.showtime-cta {
  font-size: 0.8rem;
  color: #fca5a5;
  font-weight: 600;
  margin-top: 0.35rem;
}
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
}
.btn-primary {
  margin-top: 1rem;
  padding: 0.7rem 1.5rem;
  border-radius: var(--radius-md);
  background: var(--accent-red);
  color: #fff;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-red-hover); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 640px) {
  .movie-header { grid-template-columns: 1fr; }
  .movie-poster-large { max-width: 180px; }
}
</style>