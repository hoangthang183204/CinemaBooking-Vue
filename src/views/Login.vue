<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { apiFetch } from '../api'
import { homeForRole, useAuth } from '../auth'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'Vui lòng nhập email và mật khẩu'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
      }),
    })

    auth.setAuth(result)

    const role = result.role
    const requested = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    let target = homeForRole(role)
    if (role === 'Admin' && requested.startsWith('/admin')) target = requested
    else if (role === 'Staff' && requested.startsWith('/staff')) target = requested
    else if (role !== 'Admin' && role !== 'Staff' && requested.startsWith('/')) target = requested
    router.push(target)
  } catch (e) {
    error.value = e.message || 'Email hoặc mật khẩu không đúng'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <h1>Đăng nhập</h1>
        <p>Chào mừng bạn quay trở lại National Cinema Center</p>
      </div>

      <!-- Thông báo khi bị chặn do chưa login -->
      <div v-if="route.query.redirect" class="auth-notice">
        🔒 Vui lòng đăng nhập để tiếp tục đặt vé
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="email@example.com"
            autocomplete="email"
            required
          />
        </div>

        <div class="form-group">
          <label>Mật khẩu</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>

      <div class="auth-footer">
        <span>Chưa có tài khoản?</span>
        <router-link to="/register" class="link">Đăng ký ngay</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 68px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: radial-gradient(ellipse at top, rgba(229, 9, 20, 0.08), transparent 60%);
}
.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
}
.auth-head { text-align: center; margin-bottom: 1.5rem; }
.auth-head h1 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}
.auth-head p {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

.auth-notice {
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 1rem;
}

.auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.form-group input {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
}
.form-group input:focus {
  outline: none;
  border-color: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
}
.form-error {
  color: #fca5a5;
  font-size: 0.85rem;
  padding: 0.65rem 0.85rem;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-sm);
  margin: 0;
}
.btn-submit {
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  background: var(--accent-red);
  color: #fff;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  box-shadow: var(--shadow-glow-red);
  transition: all 0.2s;
}
.btn-submit:hover:not(:disabled) {
  background: var(--accent-red-hover);
  transform: translateY(-1px);
}
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-footer {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-top: 1.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-subtle);
}
.link {
  color: var(--accent-red);
  font-weight: 600;
  text-decoration: none;
}
.link:hover { text-decoration: underline; }
</style>