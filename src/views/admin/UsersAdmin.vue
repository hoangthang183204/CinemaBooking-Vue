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
const search = ref('')
const roleFilter = ref('all')

const filtered = computed(() => {
  let arr = list.value
  if (roleFilter.value !== 'all') {
    arr = arr.filter((u) => u.role === roleFilter.value)
  }
  const q = search.value.trim().toLowerCase()
  if (!q) return arr
  return arr.filter(
    (u) =>
      u.email.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q)
  )
})

const { page, pageCount, total, items: pageItems } = usePager(filtered)

async function fetchList() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch('/api/admin/users')
    list.value = data ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function changeRole(user, newRole) {
  if (user.role === newRole) return
  const roleLabel = {
    Customer: 'Khách hàng',
    Staff: 'Nhân viên',
    Admin: 'Admin',
  }[newRole]

  try {
    await apiFetch(`/api/admin/users/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole }),
    })
    await fetchList()
    toast.success(`Đã đổi "${user.fullName}" thành ${roleLabel}`)
  } catch (e) {
    toast.error('Không thể đổi vai trò: ' + e.message)
    await fetchList()
  }
}

async function toggleStatus(user) {
  const newStatus = !user.isActive
  const action = newStatus ? 'kích hoạt' : 'khóa'
  if (!confirm(`${action} người dùng "${user.fullName}"?`)) return

  try {
    await apiFetch(`/api/admin/users/${user.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: newStatus }),
    })
    await fetchList()
    toast.success(
      newStatus
        ? `Đã kích hoạt "${user.fullName}"`
        : `Đã khóa "${user.fullName}"`
    )
  } catch (e) {
    toast.error('Lỗi: ' + e.message)
  }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

function roleClass(role) {
  const map = { Admin: 'admin', Staff: 'staff', Customer: 'customer' }
  return map[role] || 'customer'
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Quản lý người dùng</h2>
        <p class="page-sub">{{ list.length }} người dùng trong hệ thống</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-wrap">
        <AppIcon name="search" :size="16" class="search-icon" />
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Tìm theo email hoặc tên..."
        />
      </div>

      <div class="filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: roleFilter === 'all' }"
          @click="roleFilter = 'all'"
        >Tất cả</button>
        <button
          class="filter-tab"
          :class="{ active: roleFilter === 'Customer' }"
          @click="roleFilter = 'Customer'"
        >Khách hàng</button>
        <button
          class="filter-tab"
          :class="{ active: roleFilter === 'Staff' }"
          @click="roleFilter = 'Staff'"
        >Nhân viên</button>
        <button
          class="filter-tab"
          :class="{ active: roleFilter === 'Admin' }"
          @click="roleFilter = 'Admin'"
        >Admin</button>
      </div>
    </div>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>
    <p v-else-if="filtered.length === 0" class="state">Không tìm thấy người dùng nào.</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:70px">ID</th>
            <th>Người dùng</th>
            <th style="width:160px">Số điện thoại</th>
            <th style="width:170px">Vai trò</th>
            <th style="width:100px">Đơn đặt</th>
            <th style="width:140px">Ngày tạo</th>
            <th style="width:130px">Trạng thái</th>
            <th style="width:100px">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in pageItems" :key="u.id">
            <td class="cell-id">#{{ u.id }}</td>
            <td>
              <div class="user-cell">
                <div class="user-avatar">{{ u.fullName.charAt(0).toUpperCase() }}</div>
                <div class="user-info">
                  <div class="cell-title">{{ u.fullName }}</div>
                  <div class="cell-sub">{{ u.email }}</div>
                </div>
              </div>
            </td>
            <td>
              <span v-if="u.phone">{{ u.phone }}</span>
              <span v-else class="cell-muted">—</span>
            </td>
            <td>
              <select
                class="role-select"
                :class="roleClass(u.role)"
                :value="u.role"
                @change="(e) => changeRole(u, e.target.value)"
              >
                <option value="Customer">Khách hàng</option>
                <option value="Staff">Nhân viên</option>
                <option value="Admin">Admin</option>
              </select>
            </td>
            <td>
              <span class="booking-count">{{ u.bookingCount }}</span>
            </td>
            <td>{{ formatDate(u.createdAt) }}</td>
            <td>
              <span class="badge" :class="u.isActive ? 'active' : 'inactive'">
                {{ u.isActive ? 'Hoạt động' : 'Đã khóa' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button
                  class="btn-icon"
                  :class="u.isActive ? 'danger' : 'success'"
                  :title="u.isActive ? 'Khóa' : 'Kích hoạt'"
                  @click="toggleStatus(u)"
                >
                  <AppIcon :name="u.isActive ? 'lock' : 'unlock'" :size="16" />
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

.toolbar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}
.search-wrap {
  flex: 1;
  min-width: 240px;
  max-width: 400px;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
}
.search-input:focus { outline: none; border-color: var(--accent-red); }
.search-input::placeholder { color: var(--text-dim); }

.filter-tabs {
  display: flex;
  gap: 0.35rem;
  padding: 0.3rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.filter-tab {
  padding: 0.5rem 0.9rem;
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
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table thead { background: rgba(255, 255, 255, 0.03); }
.data-table th {
  text-align: left;
  padding: 0.9rem 1rem;
  font-size: 0.72rem;
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
.cell-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem; }
.cell-muted { color: var(--text-dim); }

.user-cell { display: flex; align-items: center; gap: 0.75rem; }
.user-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e50914, #fbbf24);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.user-info { display: flex; flex-direction: column; }

.role-select {
  padding: 0.4rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.role-select.customer { color: #86efac; border-color: rgba(34, 197, 94, 0.3); }
.role-select.staff { color: #93c5fd; border-color: rgba(59, 130, 246, 0.3); }
.role-select.admin { color: #fca5a5; border-color: rgba(229, 9, 20, 0.3); }
.role-select option { background: #1a1a1a; color: var(--text-primary); }

.booking-count {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: rgba(251, 191, 36, 0.12);
  color: var(--accent-gold);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
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
.badge.active { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.badge.inactive { background: rgba(248, 113, 113, 0.15); color: #f87171; }

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
.btn-icon.danger:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.4);
  color: #f87171;
}
.btn-icon.success:hover {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}
</style>