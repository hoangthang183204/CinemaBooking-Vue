<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col brand-col">
        <div class="brand-row">
          <div class="brand-logo-sm">
            <span class="logo-e">E</span>
            <span class="logo-m">M</span>
          </div>
          <span class="brand-name">NATIONAL CINEMA CENTER</span>
        </div>
        <p>Hệ thống rạp chiếu phim hiện đại, mang đến trải nghiệm điện ảnh tuyệt vời cho mọi khán giả.</p>
      </div>

      <div class="footer-col">
        <h4>Liên kết</h4>
        <ul>
          <li><router-link to="/gioi-thieu">Về chúng tôi</router-link></li>
          <li><a href="#">Tuyển dụng</a></li>
          <li><a href="#">Liên hệ</a></li>
          <li><a href="#">Đối tác</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Hỗ trợ</h4>
        <ul>
          <li><a href="#">Câu hỏi thường gặp</a></li>
          <li><a href="#">Điều khoản</a></li>
          <li><a href="#">Chính sách bảo mật</a></li>
          <li><a href="#">Hướng dẫn đặt vé</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Theo dõi</h4>
        <div class="socials">
          <a href="#" aria-label="Facebook">📘</a>
          <a href="#" aria-label="Instagram">📷</a>
          <a href="#" aria-label="YouTube">▶️</a>
        </div>
        <p class="hotline">Hotline: <strong>1900 1234</strong></p>
      </div>
    </div>

    <div class="footer-bottom">
      © 2026 National Cinema Center. All rights reserved.
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: var(--footer-bg);
  border-top: 1px solid var(--border-subtle);
  margin-top: 4rem;
  padding: 3rem 1.5rem 1.5rem;
}
.footer-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-subtle);
}
.footer-col h4 {
  color: var(--text-primary);
  font-size: 0.95rem;
  margin: 0 0 1rem;
  font-weight: 700;
}
.footer-col p,
.footer-col li {
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.7;
  margin: 0;
}
.footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.footer-col ul li {
  margin-bottom: 0.35rem;
}
.footer-col ul li a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-col ul li a:hover { color: #ff4d4f; }

.brand-col p { margin-top: 1rem; }
.brand-row { display: flex; align-items: center; gap: 0.6rem; }
.brand-logo-sm {
  width: 32px; height: 32px;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.85rem;
}
.brand-logo-sm .logo-e { color: #e50914; }
.brand-logo-sm .logo-m { color: #1e3a8a; }
.brand-name {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 0.05em;
}

.socials {
  display: flex;
  gap: 0.75rem;
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}
.socials a { text-decoration: none; }
.hotline { color: var(--text-muted); font-size: 0.85rem; }
.hotline strong { color: #ff4d4f; }

.footer-bottom {
  max-width: 1440px;
  margin: 0 auto;
  padding-top: 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .footer-inner { grid-template-columns: 1fr 1fr; }
}
</style>