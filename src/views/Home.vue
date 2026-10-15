<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api'

const router = useRouter()
const movies = ref([])
const movieQuery = ref('')
const loading = ref(true)
const error = ref('')
const currentSlide = ref(0)

const fallbackHeroes = [
  {
    title: 'TRẠI BUÔN NGƯỜI',
    subtitle: 'THE JOURNEY OF HEROES',
    date: '25.09.2026',
    tag: 'A FILM BY TONI DƯƠNG BẢO ANH & MÈO BÍCH TRANG',
    bg: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600',
    movieId: 1,
  },
  {
    title: 'HỒN ĐÁO QUÊN LÀNG',
    subtitle: 'PHIM HOẠT HÌNH VIỆT NAM',
    date: '25.09.2026',
    tag: 'SUẤT CHIẾU ĐẶC BIỆT',
    bg: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600',
    movieId: 1,
  },
]
const fallbackSnacks = [
  { title: 'COMBO BẮP NƯỚC', sub: 'Đồng giá 79K', color: '#e63946' },
  { title: 'THIS OR THAT', sub: 'Chọn combo yêu thích', color: '#3b82f6' },
  { title: 'SPECIAL MONDAY', sub: 'Đồng giá 50.000đ/vé 2D', color: '#f59e0b' },
]

const heroSlides = ref(fallbackHeroes)
const adBanners = ref(fallbackSnacks)

function mapHero(block) {
  return {
    title: block.title,
    subtitle: block.subtitle || '',
    date: block.dateLabel || '',
    tag: block.tag || '',
    bg: block.imageUrl || '',
    movieId: block.movieId || null,
  }
}

function mapSnack(block) {
  return {
    title: block.title,
    sub: block.subtitle || '',
    color: block.accentColor || '#e63946',
  }
}

onMounted(async () => {
  restartSlideTimer()
  try {
    const [data, content] = await Promise.all([
      apiFetch('/api/Movies'),
      apiFetch('/api/home-content').catch(() => null),
    ])
    movies.value = data ?? []
    if (content?.heroes?.length) heroSlides.value = content.heroes.map(mapHero)
    if (content?.snacks?.length) adBanners.value = content.snacks.map(mapSnack)
    if (currentSlide.value >= heroSlides.value.length) currentSlide.value = 0
  } catch (e) {
    error.value = e.message || 'Lỗi kết nối'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (slideTimer) clearInterval(slideTimer)
})

let slideTimer = null

function advanceSlide() {
  if (heroSlides.value.length < 2) return
  currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length
}

function restartSlideTimer() {
  if (slideTimer) clearInterval(slideTimer)
  slideTimer = setInterval(advanceSlide, 5000)
}

function showSlide(index) {
  if (!heroSlides.value.length) return
  currentSlide.value = (index + heroSlides.value.length) % heroSlides.value.length
  restartSlideTimer()
}

const visibleMovies = computed(() => {
  const query = movieQuery.value.trim().toLowerCase()
  if (!query) return movies.value
  return movies.value.filter((movie) =>
    [movie.title, movie.genre, movie.director]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  )
})

function goToShowtimes(movie) {
  router.push({ name: 'MovieShowtimes', params: { id: movie.id } })
}

function bookCurrentSlide() {
  const slide = heroSlides.value[currentSlide.value]
  const movieId = slide?.movieId || movies.value[0]?.id || 1
  goToShowtimes({ id: movieId })
}

function formatDuration(mins) {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}p` : `${m} phút`
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Fallback: nếu backend không trả PosterUrl → dùng gradient theo id
function getPosterGradient(id) {
  const gradients = [
    'linear-gradient(145deg, #1e3a8a, #0f172a)',
    'linear-gradient(145deg, #7c2d12, #0f172a)',
    'linear-gradient(145deg, #14532d, #0f172a)',
    'linear-gradient(145deg, #581c87, #0f172a)',
    'linear-gradient(145deg, #831843, #0f172a)',
  ]
  return gradients[(id - 1) % gradients.length]
}

</script>

<template>
  <div class="home">
    <!-- HERO SLIDER -->
    <section class="hero-slider">
      <div
        class="hero-slide"
        :style="{ backgroundImage: `url(${heroSlides[currentSlide].bg})` }"
      >
        <div class="hero-overlay" />
        <div class="hero-content">
          <p class="hero-tag">{{ heroSlides[currentSlide].tag }}</p>
          <h1 class="hero-title">{{ heroSlides[currentSlide].title }}</h1>
          <p class="hero-subtitle">{{ heroSlides[currentSlide].subtitle }}</p>
          <div class="hero-date">
            <span class="date-label">CHÍNH THỨC KHỞI CHIẾU</span>
            <span class="date-value">{{ heroSlides[currentSlide].date }}</span>
          </div>
          <button class="hero-cta" @click="bookCurrentSlide">
            Đặt vé ngay
          </button>
        </div>
      </div>

      <button
        class="slider-arrow left"
        @click="showSlide(currentSlide - 1)"
      >‹</button>
      <button
        class="slider-arrow right"
        @click="showSlide(currentSlide + 1)"
      >›</button>

      <div class="slider-dots">
        <span
          v-for="(s, i) in heroSlides"
          :key="i"
          class="dot"
          :class="{ active: i === currentSlide }"
          @click="showSlide(i)"
        />
      </div>
    </section>

    <!-- MAIN CONTENT -->
    <div class="content-wrapper">
      <!-- LEFT: Movies -->
      <div class="movies-column">
        <div class="section-head">
          <h2 class="section-title">Phim đang chiếu</h2>
          <label class="movie-search">
            <input
              v-model="movieQuery"
              type="search"
              placeholder="Tìm phim, thể loại, đạo diễn"
              aria-label="Tìm phim"
            />
          </label>
        </div>

        <div v-if="loading" class="state">
          <div class="spinner" />
          <p>Đang tải danh sách phim...</p>
        </div>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <p v-else-if="movies.length === 0" class="state">Chưa có phim nào.</p>
        <p v-else-if="visibleMovies.length === 0" class="state">Không tìm thấy phim khớp với “{{ movieQuery }}”.</p>

        <div v-else class="movie-grid">
          <article
            v-for="movie in visibleMovies"
            :key="movie.id"
            class="movie-card"
            @click="goToShowtimes(movie)"
          >
            <div class="movie-poster">
              <!-- Có poster URL → hiển thị ảnh -->
              <img
                v-if="movie.posterUrl"
                :src="movie.posterUrl"
                :alt="movie.title"
                class="poster-img"
                loading="lazy"
                @error="(e) => e.target.style.display = 'none'"
              />
              <!-- Không có poster → fallback gradient + emoji -->
              <div
                v-else
                class="poster-fallback"
                :style="{ background: getPosterGradient(movie.id) }"
              >
                <span class="poster-icon">🎬</span>
              </div>
              <span class="poster-badge">P13</span>
              <div class="poster-overlay">
                <button class="btn-book-overlay">Đặt vé</button>
              </div>
            </div>
            <div class="movie-info">
              <div class="movie-meta-top">
                <span class="genre">{{ movie.genre || 'Đang cập nhật' }}</span>
                <span v-if="movie.releaseDate" class="release">
                  {{ formatReleaseDate(movie.releaseDate) }}
                </span>
              </div>
              <h3 class="movie-title">{{ movie.title }}</h3>
              <p class="movie-duration">{{ formatDuration(movie.duration) }}</p>
            </div>
          </article>
        </div>
      </div>

      <!-- RIGHT: Sidebar ads -->
      <aside class="sidebar">
        <div
          v-for="(ad, i) in adBanners"
          :key="i"
          class="ad-banner"
          :style="{ background: `linear-gradient(135deg, ${ad.color} 0%, #1a1a1a 100%)` }"
        >
          <span class="ad-title">{{ ad.title }}</span>
          <span class="ad-sub">{{ ad.sub }}</span>
        </div>

        <div class="sidebar-event">
          <h4>Sự kiện</h4>
          <div class="event-item">
            <span class="event-icon">🎉</span>
            <div>
              <p class="event-title">Tuần phim đặc biệt</p>
              <p class="event-date">15.10.2026</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.home { width: 100%; background: var(--bg-primary); }

/* ========== HERO ========== */
.hero-slider {
  position: relative;
  width: 100%;
  height: 520px;
  overflow: hidden;
}
.hero-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: opacity 0.5s ease;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.7) 40%,
    rgba(0, 0, 0, 0.3) 70%,
    rgba(0, 0, 0, 0.6) 100%
  );
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 640px;
  margin-left: 8%;
  padding: 0 4rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.hero-tag {
  font-size: 0.75rem;
  color: #d1d5db;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin: 0 0 1rem;
  font-weight: 600;
}
.hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  color: #fff;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
  line-height: 1;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}
.hero-subtitle {
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  color: #d1d5db;
  margin: 0 0 1.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.hero-date {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.date-label {
  font-size: 0.8rem;
  color: #9ca3af;
  letter-spacing: 0.1em;
}
.date-value {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: #e50914;
  color: #fff;
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  border-radius: 4px;
}
.hero-cta {
  align-self: flex-start;
  padding: 0.85rem 2rem;
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.hero-cta:hover { background: #e63946; transform: translateY(-2px); }

.slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 3;
  transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.slider-arrow:hover { background: rgba(229, 9, 20, 0.8); }
.slider-arrow.left { left: 1.5rem; }
.slider-arrow.right { right: 1.5rem; }

.slider-dots {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  z-index: 3;
}
.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}
.dot.active { background: #ff4d4f; width: 24px; border-radius: 4px; }

@media (max-width: 768px) {
  .hero-slider { height: 420px; }
  .hero-content { padding: 0 1.5rem; margin-left: 0; }
}

/* ========== CONTENT WRAPPER ========== */
.content-wrapper {
  max-width: 1440px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
}

/* Movies column */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.movie-search { flex: 1; max-width: 320px; }
.movie-search input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.7rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--bg-card);
  color: var(--text-primary);
  font: inherit;
}
.movie-search input:focus {
  outline: none;
  border-color: #ff4d4f;
}
.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
  position: relative;
  padding-bottom: 0.75rem;
}
.section-title::after {
  content: '';
  position: absolute;
  left: 0; bottom: 0;
  width: 60px; height: 3px;
  background: #ff4d4f;
  border-radius: 2px;
}

.state {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 3rem; color: var(--text-muted);
}
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #ff4d4f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Movie grid */
.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}
.movie-card {
  cursor: pointer;
  transition: transform 0.25s ease;
}
.movie-card:hover { transform: translateY(-6px); }

.movie-poster {
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(145deg, #1f2937, #111827);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

/* Ảnh poster thật */
.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Fallback khi không có poster */
.poster-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-icon { font-size: 3.5rem; opacity: 0.55; }

.poster-badge {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  padding: 0.2rem 0.5rem;
  background: #e50914;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.poster-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s;
}
.movie-card:hover .poster-overlay { opacity: 1; }
.btn-book-overlay {
  padding: 0.6rem 1.5rem;
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}

.movie-info { padding: 0.85rem 0.25rem; }
.movie-meta-top {
  display: flex;
  gap: 0.6rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
  flex-wrap: wrap;
}
.genre { color: var(--text-muted); }
.release { color: var(--text-muted); }
.movie-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.35rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.7em;
}
.movie-duration {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

/* ========== SIDEBAR ========== */
.sidebar { display: flex; flex-direction: column; gap: 1rem; }
.ad-banner {
  padding: 1.5rem;
  border-radius: 12px;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: transform 0.2s;
}
.ad-banner:hover { transform: translateY(-3px); }
.ad-title {
  font-size: 1.1rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.01em;
  margin-bottom: 0.25rem;
}
.ad-sub { font-size: 0.85rem; color: rgba(255, 255, 255, 0.85); }

.sidebar-event {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1.25rem;
}
.sidebar-event h4 {
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0 0 1rem;
  font-weight: 700;
}
.event-item { display: flex; gap: 0.75rem; align-items: center; }
.event-icon {
  font-size: 1.75rem;
  width: 48px; height: 48px;
  background: rgba(255, 77, 79, 0.15);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.event-title {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
  margin: 0 0 0.15rem;
}
.event-date { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

@media (max-width: 1024px) {
  .content-wrapper { grid-template-columns: 1fr; }
  .sidebar { flex-direction: row; overflow-x: auto; }
  .ad-banner { min-width: 240px; }
}
</style>