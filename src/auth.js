import { ref, computed } from 'vue'

const TOKEN_KEY = 'cb_token'
const USER_KEY = 'cb_user'

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const user = ref(readUser())

console.log('[auth init] token:', token.value ? 'YES' : 'NO')
console.log('[auth init] user:', user.value)

export function homeForRole(role) {
  if (role === 'Admin') return '/admin'
  if (role === 'Staff') return '/staff'
  return '/'
}

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const isStaff = computed(
    () => user.value?.role === 'Staff' || user.value?.role === 'Admin'
  )

  function setAuth(authData) {
    console.log('[auth] setAuth called with:', authData)

    if (!authData) {
      console.error('[auth] authData is null/undefined!')
      return
    }

    if (!authData.token) {
      console.error('[auth] No token in authData!', authData)
      return
    }

    token.value = authData.token
    user.value = {
      userId: authData.userId,
      email: authData.email,
      fullName: authData.fullName,
      role: authData.role,
    }

    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))

    console.log('[auth] ✅ Saved. Token:', token.value.slice(0, 30) + '...')
    console.log('[auth] ✅ Storage:', localStorage.getItem(TOKEN_KEY) ? 'OK' : 'FAIL')
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    console.log('[auth] logged out')
  }

  return { token, user, isLoggedIn, isAdmin, isStaff, setAuth, logout }
}