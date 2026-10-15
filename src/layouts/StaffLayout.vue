<script setup>
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../auth'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const sidebarOpen = ref(false)

const menuItems = [
  { name: 'Ca trực', path: '/staff', icon: 'dashboard', exact: true },
  { name: 'Bán vé tại quầy', path: '/staff/pos', icon: 'money' },
  { name: 'Bắp nước', path: '/staff/concessions', icon: 'snack' },
  { name: 'Soát vé', path: '/staff/checkin', icon: 'qrcode' },
  { name: 'Đơn đặt vé', path: '/staff/bookings', icon: 'ticket' },
  { name: 'QR thu tiền', path: '/staff/qr', icon: 'refresh' },
]

function isActive(item) {
  if (item.exact) return route.path === item.path
  return route.path.startsWith(item.path)
}

const pageTitle = computed(() => {
  const found = menuItems.find((m) => isActive(m))
  return found?.name || 'Nhân viên'
})

function handleLogout() {
  auth.logout()
  router.push('/')
}

const userInitial = computed(() => {
  const name = auth.user.value?.fullName || ''
  return name.charAt(0).toUpperCase() || '?'
})

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="staff-shell force-dark">
    <!-- SIDEBAR -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <span class="logo-e">E</span>
          <span class="logo-m">M</span>
        </div>
        <div class="brand-text">
          <span class="brand-line">STAFF PANEL</span>
          <span class="brand-sub">National Cinema</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item) }"
          @click="closeSidebar"
        >
          <AppIcon :name="item.icon" :size="18" class="nav-icon" />
          <span class="nav-label">{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <RouterLink to="/" class="nav-item">
          <AppIcon name="home" :size="18" class="nav-icon" />
          <span class="nav-label">Về trang chủ</span>
        </RouterLink>
        <button class="nav-item logout-btn" @click="handleLogout">
          <AppIcon name="logout" :size="18" class="nav-icon" />
          <span class="nav-label">Đăng xuất</span>
        </button>
      </div>
    </aside>

    <!-- Backdrop mobile -->
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar" />

    <!-- MAIN AREA -->
    <div class="main-area">
      <!-- Topbar -->
      <header class="topbar">
        <button class="menu-toggle" @click="sidebarOpen = !sidebarOpen">
          <AppIcon name="menu" :size="22" />
        </button>
        <h1 class="topbar-title">{{ pageTitle }}</h1>

        <div class="topbar-right">
          <span class="user-role-badge">STAFF</span>
          <div class="user-info">
            <span class="user-avatar">{{ userInitial }}</span>
            <span class="user-name">{{ auth.user.value?.fullName }}</span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="staff-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.staff-shell {
  display: flex;
  min-height: 100vh;
  background: #0a0a0a;
}

/* ========== SIDEBAR ========== */
.sidebar {
  width: 260px;
  background: #0d0d0d;
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
  transition: transform 0.3s ease;
}

.sidebar-brand {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.brand-logo {
  width: 40px; height: 40px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-weight: 900;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.logo-e { color: #e50914; }
.logo-m { color: #1e3a8a; }
.brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.brand-line {
  font-size: 0.7rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.08em;
}
.brand-sub {
  font-size: 0.65rem;
  color: #6b7280;
  font-weight: 500;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  width: 100%;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}
.nav-item.active {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border-left: 3px solid #3b82f6;
  padding-left: calc(0.85rem - 3px);
}
.nav-icon { flex-shrink: 0; color: inherit; }
.nav-label { flex: 1; }

.sidebar-footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.logout-btn { color: #fca5a5; }
.logout-btn:hover { background: rgba(248, 113, 113, 0.1); }

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 40;
  backdrop-filter: blur(2px);
}

/* ========== MAIN AREA ========== */
.main-area {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  background: #0d0d0d;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1.5rem;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 30;
}
.menu-toggle {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
}
.menu-toggle:hover { background: rgba(255, 255, 255, 0.08); }

.topbar-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.user-role-badge {
  padding: 0.25rem 0.75rem;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  letter-spacing: 0.05em;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.user-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
}
.user-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.staff-content {
  flex: 1;
  padding: 1.5rem;
  overflow-x: hidden;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 992px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .main-area {
    margin-left: 0;
  }
  .menu-toggle { display: flex; }
  .user-name { display: none; }
}

@media (max-width: 640px) {
  .staff-content { padding: 1rem; }
  .topbar { padding: 0 1rem; }
}
</style>