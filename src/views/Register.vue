<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api'
import { useAuth } from '../auth'

const router = useRouter()
const auth = useAuth()

const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  error.value = ''

  if (!fullName.value.trim()) {
    error.value = 'Vui lòng nhập họ tên'
    return
  }
  if (!email.value.trim()) {
    error.value = 'Vui lòng nhập email'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Mật khẩu phải có ít nhất 6 ký tự'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Mật khẩu xác nhận không khớp'
    return
  }

  loading.value = true
  try {
    const result = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
        fullName: fullName.value.trim(),
        phone: phone.value.trim() || null,
      }),
    })

    auth.setAuth(result)
    router.push('/')
  } catch (e) {
    error.value = e.message || 'Đăng ký thất bại'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <h1>Đăng ký</h1>
        <p>Tạo tài khoản để đặt vé nhanh chóng</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>Họ và tên</label>
          <input v-model="fullName" type="text" placeholder="Nguyễn Văn A" required />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="email@example.com" required />
        </div>

        <div class="form-group">
          <label>Số điện thoại <span class="optional">(không bắt buộc)</span></label>
          <input v-model="phone" type="tel" placeholder="0901234567" />
        </div>

        <div class="form-group">
          <label>Mật khẩu</label>
          <input v-model="password" type="password" placeholder="Ít nhất 6 ký tự" required />
        </div>

        <div class="form-group">
          <label>Xác nhận mật khẩu</label>
          <input v-model="confirmPassword" type="password" placeholder="Nhập lại mật khẩu" required />
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Đang xử lý...' : 'Đăng ký' }}
        </button>
      </form>

      <div class="auth-footer">
        <span>Đã có tài khoản?</span>
        <router-link to="/login" class="link">Đăng nhập</router-link>
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
  max-width: 440px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
}
.auth-head { text-align: center; margin-bottom: 2rem; }
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
.auth-form { display: flex; flex-direction: column; gap: 1.1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.optional { color: var(--text-dim); font-weight: 400; font-size: 0.8rem; }
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
  margin-top: 0.5rem;
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