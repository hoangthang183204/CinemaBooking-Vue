# National Cinema Center

Giao diện web đặt vé xem phim, viết bằng Vue 3, Vue Router và Vite. Khách đặt vé online. Nhân viên bán vé tại quầy. Quản trị viên quản lý rạp.

API là project ASP.NET Core .NET 6 ở thư mục `CinemaBookingSystem`, project chạy là `WebApplication1`.

## Vai trò

Đăng nhập xong, hệ thống đưa mỗi người về đúng khu:

- Khách về trang chủ.
- Nhân viên về `/staff`.
- Quản trị về `/admin`.

## Khách xem phim

- Trang chủ có banner tự đổi, combo, danh sách phim và ô tìm phim. Có chế độ sáng và tối.
- Chi tiết phim có poster, quốc gia, ngôn ngữ, diễn viên, trailer, điểm đánh giá và suất chiếu của đúng phim đó. Suất đã qua giờ không đặt được.
- Các trang nội dung: lịch chiếu, tin tức, khuyến mãi, giá vé, liên hoan phim, giới thiệu. Trang khuyến mãi hiện mã để khách nhập lúc đặt vé.
- Chọn ghế trên sơ đồ phòng. Ghế được giữ 10 phút, tối đa 8 ghế. Có thể thêm bắp nước và nhập mã giảm giá.
- Trang thanh toán hiện tiền ghế, bắp nước, phụ thu, số tiền mã giảm trừ và tổng phải trả. Thanh toán bằng VNPay, MoMo hoặc QR chuyển khoản.
- Vé của tôi có phân trang. Vé chưa trả thì hủy được. Vé đã trả thì hoàn được nếu còn hơn 2 giờ trước giờ chiếu. Vé có mã QR từng ghế.

## Nhân viên

- Ca trực: mở ca, xem doanh thu rạp và số đã thu hôm nay, bàn giao ca, in và lưu biên bản. Nhân viên kế tiếp thấy số tiền mặt đầu ca rồi bấm nhận ca.
- Bán vé tại quầy: chọn phim, suất còn giờ, ghế, bắp nước, thu tiền mặt có tính tiền thối, hoặc nhận chuyển khoản. In hóa đơn kèm QR.
- Bắp nước: xem và sửa tồn kho.
- Soát vé bằng QR. Vé hợp lệ, vé đã dùng và vé sai ngày chiếu có màu khác nhau.
- Đơn đặt vé: tìm khách theo điện thoại hoặc email, in lại vé, hủy, hoàn tiền, đổi suất, đánh dấu đã trả tiền.
- Tạo QR thu tiền theo số tiền.

## Quản trị

Menu được gom thành nhóm xổ xuống.

- Dashboard: doanh thu 14 ngày, tỷ lệ lấp đầy ghế, cảnh báo, đơn gần đây và phim bán chạy.
- Phim, phòng, sơ đồ ghế và suất chiếu. Cùng một phòng, suất sau phải cách lúc phim trước kết thúc ít nhất 30 phút.
- Người dùng: đổi vai trò, khóa hoặc mở tài khoản.
- Nhân viên: ảnh, họ tên, điện thoại, CCCD, chức vụ, trạng thái làm việc, lịch sử ca. Dải Ca hiện tại cho biết ai đang trực.
- Ca trực: danh sách, gán ca, lịch sử bán trong ca, nhập tiền đếm và duyệt ca.
- Đơn đặt vé, bắp nước, banner, combo, mã khuyến mãi, nội dung trang.
- Báo cáo doanh thu theo phim, phòng hoặc khung giờ, xuất Excel.
- Cấu hình giá vé, giờ mở cửa, giờ đóng cửa, phụ thu và mức cảnh báo bắp nước sắp hết.

## Chạy giao diện

Cần Node.js 18 trở lên và API đang chạy tại `http://localhost:5065`.

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`.

Vite chuyển `/api` và `/uploads` sang `http://localhost:5065`. Muốn trỏ máy API khác thì đặt biến `VITE_API_URL` trước khi chạy.

## Cấu trúc thư mục

| Thư mục | Nội dung |
| --- | --- |
| `src/views` | Trang khách |
| `src/views/staff` | Trang quầy |
| `src/views/admin` | Trang quản trị |
| `src/layouts` | Khung sidebar của nhân viên và quản trị |
| `src/components` | Sơ đồ ghế, hóa đơn, phân trang, chọn ảnh |
| `src/router/index.js` | Đường dẫn và chặn trang theo vai trò |
| `src/api.js` | Gọi API và mở phong bì `{ success, data }` |
| `src/auth.js` | Token và thông tin đăng nhập trong `localStorage` |

Token lưu ở khóa `cb_token`, thông tin người dùng ở khóa `cb_user`. Token hết hạn sau 24 giờ. Đóng trình duyệt rồi mở lại vẫn còn đăng nhập trong thời gian đó.

## Đăng nhập bằng Google

Trang đăng nhập có nút Google. Trình duyệt chỉ gửi mã xác thực về API. API kiểm tra mã với Google, rồi cấp phiên đăng nhập của rạp. Client Secret chỉ nằm trên máy chủ, không đưa vào Vue.

Cùng một email chỉ có một tài khoản. Đăng ký bằng mật khẩu trước, sau đó đăng nhập Google bằng đúng email đó, sẽ vào tài khoản cũ và giữ nguyên vai trò.

### Tạo OAuth Client ID

1. Mở [Google Cloud Console](https://console.cloud.google.com/), chọn hoặc tạo một project.
2. Vào **APIs & Services** → **OAuth consent screen**. Chọn **External**, điền tên ứng dụng và email hỗ trợ, thêm email của bạn vào **Test users** nếu app đang ở chế độ Testing.
3. Vào **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Loại ứng dụng chọn **Web application** (Ứng dụng web).
5. Mục **Authorized JavaScript origins** (Nguồn JavaScript được ủy quyền):
   - Máy local: `http://localhost:5173`
   - Khi có domain thật: `https://ten-mien-cua-ban`
6. Mục **Authorized redirect URIs** thêm cùng hai địa chỉ trên để Google cho lưu client. Luồng nút Google dùng mã xác thực ngay trên trang, không cần đổi hướng bí mật sang frontend.
7. Bấm tạo. Sao chép **Client ID**. **Client Secret** chỉ dùng cho máy chủ.

### Đặt biến môi trường

Frontend, tạo file `.env` cạnh `package.json` (file này không được đưa lên git):

```
VITE_GOOGLE_CLIENT_ID=dán-client-id-vào-đây
```

Backend, đặt biến môi trường trước khi chạy API, không ghi secret vào mã Vue:

```
Google__ClientId=dán-client-id-vào-đây
Google__ClientSecret=dán-client-secret-vào-đây
```

Trên PowerShell:

```powershell
$env:Google__ClientId = "dán-client-id-vào-đây"
$env:Google__ClientSecret = "dán-client-secret-vào-đây"
```

Hai Client ID phải giống nhau. Sau khi sửa `.env`, tắt `npm run dev` rồi chạy lại. API cũng cần chạy lại để nhận biến môi trường.

