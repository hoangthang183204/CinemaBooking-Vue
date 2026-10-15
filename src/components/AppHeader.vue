<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ref, computed } from 'vue'
import { useAuth } from '../auth'
import { useTheme } from '../theme'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { theme, toggleTheme } = useTheme()

const mobileOpen = ref(false)
const userMenuOpen = ref(false)

const navItems = [
  { name: 'Trang chủ', path: '/' },
  { name: 'Lịch chiếu', path: '/lich-chieu' },
  { name: 'Tin tức', path: '/tin-tuc' },
  { name: 'Khuyến mãi', path: '/khuyen-mai' },
  { name: 'Giá vé', path: '/gia-ve' },
  { name: 'Liên hoan phim, Tuần phim', path: '/lien-hoan-phim' },
  { name: 'Giới thiệu', path: '/gioi-thieu' },
]

const initial = computed(() => {
  const name = auth.user.value?.fullName || ''
  return name.charAt(0).toUpperCase() || '?'
})

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function closeMenu() {
  mobileOpen.value = false
  userMenuOpen.value = false
}

function handleLogout() {
  auth.logout()
  closeMenu()
  router.push('/')
}
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <!-- Logo -->
      <RouterLink to="/" class="brand" @click="closeMenu">
        <div class="brand-logo">
          <span class="logo-e">E</span>
          <span class="logo-m">M</span>
        </div>
        <div class="brand-text">
          <span class="brand-line">NATIONAL</span>
          <span class="brand-line">CINEMA</span>
          <span class="brand-line">CENTER</span>
        </div>
      </RouterLink>

      <!-- Nav -->
      <nav class="nav" :class="{ open: mobileOpen }">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: isActive(item.path) }"
          @click="closeMenu"
        >
          {{ item.name }}
        </RouterLink>
      </nav>

      <button
        type="button"
        class="theme-btn"
        :aria-label="theme === 'dark' ? 'Bật chế độ sáng' : 'Bật chế độ tối'"
        :title="theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'"
        @click="toggleTheme"
      >
        <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
        </svg>
      </button>

      <!-- Auth section -->
      <div class="auth-actions">
        <!-- CHƯA đăng nhập -->
        <template v-if="!auth.isLoggedIn.value">
          <RouterLink to="/register" class="btn btn-outline" @click="closeMenu">
            Đăng ký
          </RouterLink>
          <RouterLink to="/login" class="btn btn-primary" @click="closeMenu">
            Đăng nhập
          </RouterLink>
        </template>

        <!-- ĐÃ đăng nhập -->
        <div v-else class="user-wrap">
          <RouterLink
            v-if="auth.user.value?.role === 'Staff'"
            to="/staff"
            class="btn btn-outline"
            @click="closeMenu"
          >
            Quầy nhân viên
          </RouterLink>
          <button class="user-btn" @click.stop="userMenuOpen = !userMenuOpen">
            <span class="user-avatar">{{ initial }}</span>
            <span class="user-name">{{ auth.user.value?.fullName }}</span>
            <span class="chevron" :class="{ open: userMenuOpen }">▾</span>
          </button>

          <!-- Dropdown menu -->
          <div v-if="userMenuOpen" class="user-menu">
            <div class="user-menu-head">
              <span class="user-menu-name">{{ auth.user.value?.fullName }}</span>
              <span class="user-menu-email">{{ auth.user.value?.email }}</span>
              <span
                class="user-menu-role"
                :class="String(auth.user.value?.role || '').toLowerCase()"
              >
                {{ auth.user.value?.role }}
              </span>
            </div>
            <RouterLink to="/my-tickets" class="user-menu-item" @click="closeMenu">
              <span class="menu-icon">🎟</span> Vé của tôi
            </RouterLink>
            <RouterLink
              v-if="auth.user.value?.role === 'Staff'"
              to="/staff"
              class="user-menu-item"
              @click="closeMenu"
            >
              <span class="menu-icon">🎬</span> Quầy nhân viên
            </RouterLink>
            <RouterLink
              v-if="auth.isAdmin.value"
              to="/admin"
              class="user-menu-item"
              @click="closeMenu"
            >
              <span class="menu-icon">⚙️</span> Quản trị
            </RouterLink>
            <button class="user-menu-item logout" @click="handleLogout">
              <span class="menu-icon">🚪</span> Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile toggle -->
      <button class="mobile-toggle" @click="mobileOpen = !mobileOpen">
        <span /><span /><span />
      </button>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 68px;
  display: flex;
  align-items: center;
  gap: 2rem;
  position: relative;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  flex-shrink: 0;
}
.brand-logo {
  width: 38px; height: 38px;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-weight: 900;
  font-size: 1rem;
}
.logo-e { color: #e50914; }
.logo-m { color: #1e3a8a; }
.brand-text { display: flex; flex-direction: column; line-height: 1; }
.brand-line {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 0.06em;
}

/* Nav */
.nav {
  display: flex;
  align-items: center;
  gap: 1.75rem;
  flex: 1;
}
.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.5rem 0;
  position: relative;
  white-space: nowrap;
  transition: color 0.2s;
}
.nav-link:hover { color: var(--text-primary); }
.nav-link.active { color: var(--accent-red); }
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 2px;
  background: var(--accent-red);
  border-radius: 2px;
}

.theme-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--hover-fill);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}
.theme-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.theme-btn:hover {
  border-color: var(--accent-red);
  color: var(--accent-red);
}

/* Auth actions */
.auth-actions {
  display: flex;
  gap: 0.65rem;
  flex-shrink: 0;
  align-items: center;
}
.auth-actions .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
  border-radius: 8px;
  text-decoration: none;
  font-family: inherit;
}
.btn-outline {
  color: var(--text-primary);
  background: transparent;
  border: 1px solid var(--border-strong);
}
.btn-outline:hover {
  background: var(--hover-fill);
  border-color: var(--accent-red);
  color: var(--text-primary);
}
.btn-primary {
  color: #fff;
  background: #e50914;
  border: 1px solid #e50914;
}
.btn-primary:hover {
  background: #b20710;
  border-color: #b20710;
  color: #fff;
}

/* User menu */
.user-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.user-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem 0.4rem 0.4rem;
  background: var(--hover-fill);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  cursor: pointer;
  color: var(--text-primary);
  font-family: inherit;
  transition: all 0.2s;
}
.user-btn:hover { background: var(--bg-card-hover); }
.user-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e50914, #fbbf24);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chevron {
  color: var(--text-muted);
  font-size: 0.75rem;
  transition: transform 0.2s;
}
.chevron.open { transform: rotate(180deg); }

/* Dropdown */
.user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: var(--menu-bg);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  z-index: 101;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.user-menu-head {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.user-menu-name {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9rem;
}
.user-menu-email {
  font-size: 0.75rem;
  color: var(--text-muted);
  word-break: break-all;
}
.user-menu-role {
  display: inline-block;
  align-self: flex-start;
  margin-top: 0.35rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}
.user-menu-role.admin { background: rgba(229, 9, 20, 0.15); color: #fca5a5; }
.user-menu-role.staff { background: rgba(59, 130, 246, 0.15); color: #93c5fd; }
.user-menu-role.customer { background: rgba(34, 197, 94, 0.15); color: #86efac; }

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.user-menu-item:hover {
  background: var(--hover-fill);
  color: var(--text-primary);
}
.user-menu-item.logout { color: #fca5a5; }
.user-menu-item.logout:hover { background: rgba(248, 113, 113, 0.1); }
.menu-icon { font-size: 1rem; }

/* Mobile */
.mobile-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: transparent;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
}
.mobile-toggle span {
  width: 22px; height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
}

@media (max-width: 1200px) {
  .nav { gap: 1rem; }
  .nav-link { font-size: 0.82rem; }
}
@media (max-width: 992px) {
  .nav { display: none; }
  .nav.open {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 68px; left: 0; right: 0;
    background: var(--header-bg);
    padding: 1rem 1.5rem;
    gap: 0.75rem;
    border-bottom: 1px solid var(--border-subtle);
    align-items: flex-start;
    z-index: 99;
  }
  .mobile-toggle { display: flex; }
  .auth-actions { margin-left: auto; }
  .auth-actions .btn { padding: 0.4rem 0.75rem; font-size: 0.75rem; }
  .user-name { display: none; }
}
</style>