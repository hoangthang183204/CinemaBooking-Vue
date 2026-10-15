<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../api'

const fallbackLead = 'Thông báo vận hành rạp và các thay đổi trên hệ thống đặt vé.'
const images = {
  'National Cinema mở thêm suất cuối tuần': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
  'Vé điện tử có mã QR check-in': 'https://images.unsplash.com/photo-1517604931442-0a0dd4d0e1a3?auto=format&fit=crop&w=900&q=80',
  'Ghế đôi đã có trên sơ đồ phòng': 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=80',
}
const fallback = [
  {
    meta: '12.10.2026',
    title: 'National Cinema mở thêm suất cuối tuần',
    text: 'Từ thứ Sáu, phòng 1 và phòng 2 tăng suất tối để phục vụ khách đặt vé online. Lịch chi tiết nằm ở mục Lịch chiếu.',
    image: images['National Cinema mở thêm suất cuối tuần'],
  },
  {
    meta: '05.10.2026',
    title: 'Vé điện tử có mã QR check-in',
    text: 'Sau khi thanh toán, vé nằm trong mục Vé của tôi. Nhân viên quét QR tại cửa phòng chiếu, không cần in giấy.',
    image: images['Vé điện tử có mã QR check-in'],
  },
  {
    meta: '28.09.2026',
    title: 'Ghế đôi đã có trên sơ đồ phòng',
    text: 'Hàng ghế đôi được chọn theo cặp. Nếu một ghế trong cặp đã bán, cả cặp sẽ không chọn được.',
    image: images['Ghế đôi đã có trên sơ đồ phòng'],
  },
]

const remote = ref(null)

onMounted(async () => {
  try {
    const data = await apiFetch('/api/site-pages')
    if (data?.news) remote.value = data.news
  } catch {
    remote.value = null
  }
})

const lead = computed(() => remote.value?.lead || fallbackLead)
const articles = computed(() => {
  const items = remote.value?.items
  if (!items?.length) return fallback
  return items.map((item) => ({
    meta: item.meta,
    title: item.title,
    text: item.body,
    image: item.imageUrl || images[item.title],
  }))
})
</script>

<template>
  <section class="info-page">
    <p class="info-kicker">NATIONAL CINEMA</p>
    <h1>Tin tức</h1>
    <p class="info-lead">{{ lead }}</p>
    <div class="info-grid">
      <article v-for="item in articles" :key="item.title" class="info-card">
        <img v-if="item.image" :src="item.image" :alt="item.title" />
        <div class="info-body">
          <span v-if="item.meta" class="info-meta">{{ item.meta }}</span>
          <h2>{{ item.title }}</h2>
          <p>{{ item.text }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
