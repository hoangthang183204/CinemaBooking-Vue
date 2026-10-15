import { ref } from 'vue'

const STORAGE_KEY = 'cb_theme'
const theme = ref('dark')

function apply(value) {
  const next = value === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = next
  theme.value = next
}

export function initTheme() {
  let saved = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  if (saved === 'light' || saved === 'dark') {
    apply(saved)
    return
  }
  const light = window.matchMedia('(prefers-color-scheme: light)').matches
  apply(light ? 'light' : 'dark')
}

export function useTheme() {
  function setTheme(value) {
    const next = value === 'light' ? 'light' : 'dark'
    apply(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* bỏ qua nếu trình duyệt chặn lưu */
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggleTheme }
}
