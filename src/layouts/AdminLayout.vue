<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../auth'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const sidebarOpen = ref(false)
const userMenuOpen = ref(false)

const menuItems = [
  { name: 'Dashboard', path: '/admin', icon: 'dashboard', exact: true },
  {
    name: 'Phim & phòng',
    icon: 'movie',
    children: [
      { name: 'Quản lý phim', path: '/admin/movies', icon: 'movie' },
      { name: 'Quản lý phòng', path: '/admin/rooms', icon: 'room' },
      { name: 'Suất chiếu', path: '/admin/showtimes', icon: 'clock' },
    ],
  },
  {
    name: 'Nhân sự',
    icon: 'users',
    children: [
      { name: 'Người dùng', path: '/admin/users', icon: 'users' },
      { name: 'Nhân viên', path: '/admin/staff', icon: 'users' },
      { name: 'Ca trực', path: '/admin/shifts', icon: 'clock' },
    ],
  },
  {
    name: 'Bán vé',
    icon: 'ticket',
    children: [
      { name: 'Đơn đặt vé', path: '/admin/bookings', icon: 'ticket' },
      { name: 'Bắp nước', path: '/admin/concessions', icon: 'money' },
    ],
  },
  {
    name: 'Banner & khuyến mãi',
    icon: 'star',
    children: [
      { name: 'Banner & Combo', path: '/admin/home', icon: 'home' },
      { name: 'Khuyến mãi', path: '/admin/promotions', icon: 'star' },
      { name: 'Nội dung trang', path: '/admin/pages', icon: 'info' },
    ],
  },
  { name: 'Báo cáo', path: '/admin/reports', icon: 'chart' },
  { name: 'Cấu hình', path: '/admin/settings', icon: 'settings' },
]

const openGroups = ref({})

function isActive(item) {
  if (item.exact) return route.path === item.path
  return route.path.startsWith(item.path)
}

const leaves = computed(() => menuItems.flatMap((item) => item.children || [item]))

const pageTitle = computed(() => {
  const found = leaves.value.find((item) => isActive(item))
  return found?.name || 'Quản trị'
})

function groupHasActive(group) {
  return (group.children || []).some((item) => isActive(item))
}

function toggleGroup(group) {
  openGroups.value = { ...openGroups.value, [group.name]: !openGroups.value[group.name] }
}

watch(() => route.path, () => {
  const next = { ...openGroups.value }
  for (const item of menuItems) {
    if (item.children && groupHasActive(item)) next[item.name] = true
  }
  openGroups.value = next
}, { immediate: true })

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

function closeUserMenu() {
  userMenuOpen.value = false
}

onMounted(() => document.addEventListener('click', closeUserMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeUserMenu))
</script>

<template>
  <div class="admin-shell force-dark">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <span class="logo-e">E</span>
          <span class="logo-m">M</span>
        </div>
        <div class="brand-text">
          <span class="brand-line">ADMIN PANEL</span>
          <span class="brand-sub">National Cinema</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <template v-for="item in menuItems" :key="item.name">
          <RouterLink
            v-if="!item.children"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item) }"
            @click="closeSidebar"
          >
            <AppIcon :name="item.icon" :size="18" class="nav-icon" />
            <span class="nav-label">{{ item.name }}</span>
          </RouterLink>
          <div v-else class="nav-group">
            <button
              class="nav-item"
              type="button"
              :class="{ active: groupHasActive(item) }"
              @click="toggleGroup(item)"
            >
              <AppIcon :name="item.icon" :size="18" class="nav-icon" />
              <span class="nav-label">{{ item.name }}</span>
              <span class="nav-chevron" :class="{ open: openGroups[item.name] }">▾</span>
            </button>
            <div v-show="openGroups[item.name]" class="nav-sub">
              <RouterLink
                v-for="child in item.children"
                :key="child.path"
                :to="child.path"
                class="nav-item sub"
                :class="{ active: isActive(child) }"
                @click="closeSidebar"
              >
                <AppIcon :name="child.icon" :size="16" class="nav-icon" />
                <span class="nav-label">{{ child.name }}</span>
              </RouterLink>
            </div>
          </div>
        </template>
      </nav>

    </aside>

    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      @click="closeSidebar"
    />

    <div class="main-area">
      <header class="topbar">
        <button class="menu-toggle" @click="sidebarOpen = !sidebarOpen">
          <AppIcon name="menu" :size="22" />
        </button>
        <h1 class="topbar-title">{{ pageTitle }}</h1>

        <div class="topbar-right">
          <div class="user-wrap" @click.stop>
            <button class="user-btn" type="button" @click="userMenuOpen = !userMenuOpen">
              <span class="user-role-badge">ADMIN</span>
              <span class="user-avatar">{{ userInitial }}</span>
              <span class="user-name">{{ auth.user.value?.fullName }}</span>
              <span class="chevron" :class="{ open: userMenuOpen }">▾</span>
            </button>
            <div v-if="userMenuOpen" class="user-menu">
              <div class="user-menu-head">
                <span class="user-menu-name">{{ auth.user.value?.fullName }}</span>
                <span class="user-menu-email">{{ auth.user.value?.email }}</span>
              </div>
              <RouterLink to="/" class="user-menu-item" @click="userMenuOpen = false">
                <AppIcon name="home" :size="16" /> Về trang chủ
              </RouterLink>
              <button class="user-menu-item logout" type="button" @click="handleLogout">
                <AppIcon name="logout" :size="16" /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #0a0a0a;
}

/* SIDEBAR */
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
  background: rgba(229, 9, 20, 0.12);
  color: #fca5a5;
  border-left: 3px solid var(--accent-red);
  padding-left: calc(0.85rem - 3px);
}
.nav-icon {
  flex-shrink: 0;
  color: inherit;
}
.nav-label { flex: 1; }
.nav-chevron {
  color: #9ca3af;
  font-size: 0.75rem;
  transition: transform 0.2s;
}
.nav-chevron.open { transform: rotate(180deg); }
.nav-sub {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0.1rem 0 0.25rem 0.65rem;
  padding-left: 0.45rem;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}
.nav-item.sub {
  padding: 0.48rem 0.7rem;
  font-size: 0.84rem;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 40;
  backdrop-filter: blur(2px);
}

/* MAIN AREA */
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
  background: rgba(229, 9, 20, 0.15);
  border: 1px solid rgba(229, 9, 20, 0.35);
  color: #fca5a5;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  letter-spacing: 0.05em;
}
.user-wrap { position: relative; }
.user-btn {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.25rem 0.7rem 0.25rem 0.25rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
}
.user-btn:hover { background: rgba(255, 255, 255, 0.08); }
.chevron { color: #9ca3af; font-size: 0.75rem; transition: transform 0.2s; }
.chevron.open { transform: rotate(180deg); }
.user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 230px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0.45rem;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  z-index: 80;
}
.user-menu-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.55rem 0.7rem 0.7rem;
  margin-bottom: 0.35rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.user-menu-name { font-weight: 700; }
.user-menu-email { color: var(--text-muted); font-size: 0.75rem; word-break: break-all; }
.user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 0.7rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #e5e7eb;
  text-decoration: none;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
}
.user-menu-item:hover { background: rgba(255, 255, 255, 0.06); }
.user-menu-item.logout { color: #fca5a5; }
.user-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e50914, #fbbf24);
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

.admin-content {
  flex: 1;
  padding: 1.5rem;
  overflow-x: hidden;
}

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
  .admin-content { padding: 1rem; }
  .topbar { padding: 0 1rem; }
}
</style>