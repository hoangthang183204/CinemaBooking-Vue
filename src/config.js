// Để dùng proxy Vite: không set VITE_API_URL (request gửi tới /api, proxy chuyển sang backend).
// Để gọi trực tiếp backend: set VITE_API_URL=https://localhost:5001 (hoặc cổng API của bạn).
export const API_BASE = import.meta.env.VITE_API_URL || ''
