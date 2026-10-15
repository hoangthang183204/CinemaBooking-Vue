import { API_BASE } from './config'

const TOKEN_KEY = 'cb_token'

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const { raw = false, headers: extraHeaders, ...rest } = options

  const headers = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  })

  let json = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (!res.ok) {
    const msg = json?.message || json?.title || `Lỗi HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.payload = json
    throw err
  }

  if (raw) return json

  if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
    return json.data
  }
  return json
}
