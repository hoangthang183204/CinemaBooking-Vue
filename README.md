# Cinema Booking Vue — Giao diện chọn ghế

Frontend Vue 3 (Vite) cho hệ thống đặt vé xem phim, tích hợp với API tại project **CinemaBookingSystem**.

## Yêu cầu

- Node.js 18+
- Backend API chạy và bật CORS (project .NET CinemaBookingSystem)

## Cài đặt & Chạy

```bash
cd d:\HocDotNet\CinemaBookingVue
npm install
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

## Cấu hình API

- **Dùng proxy (mặc định):** Request từ Vue gửi tới `/api/...`, Vite proxy chuyển sang backend. Trong `vite.config.js` sửa `target` thành URL backend (ví dụ `https://localhost:5001`).
- **Gọi trực tiếp backend:** Tạo file `.env` với:
  ```
  VITE_API_URL=https://localhost:5001
  ```
  (Thay đúng cổng mà API .NET đang chạy.)

## Chức năng

- **Chọn suất chiếu:** Dropdown danh sách suất chiếu (phim, phòng, giờ chiếu).
- **Sơ đồ ghế:** Hiển thị theo hàng (A, B, C...) với trạng thái:
  - Trống (Available) — có thể chọn
  - Đã đặt (Booked) — không thể chọn
  - Đang chọn (Selected) — ghế user đang chọn, có thể bỏ chọn
- **Đặt vé:** Chọn một hoặc nhiều ghế trống, bấm "Xác nhận đặt vé" để gọi API đặt vé.

## Cấu trúc

- `src/views/SeatSelection.vue` — Trang chọn suất chiếu và hiển thị sơ đồ ghế.
- `src/components/SeatMap.vue` — Component sơ đồ ghế (grid theo hàng, trạng thái, chọn/bỏ chọn, gọi API đặt vé).
