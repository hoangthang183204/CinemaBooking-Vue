<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../api'

const fallbackLead = 'National Cinema Center là rạp đặt vé trực tuyến và bán vé tại quầy. Khách xem lịch, chọn ghế, thanh toán và nhận vé QR. Nhân viên check-in bằng mã trên vé.'
const images = {
  'Đặt vé online': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
  'Quầy vé': 'https://images.unsplash.com/photo-1517604931442-0a0dd4d0e1a3?auto=format&fit=crop&w=900&q=80',
  'Liên hệ': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80',
}
const fallback = [
  { title: 'Đặt vé online', text: 'Chọn phim, suất chiếu và ghế. Ghế được giữ 10 phút trước khi thanh toán.', image: images['Đặt vé online'] },
  { title: 'Quầy vé', text: 'Nhân viên bán vé tại quầy, thu tiền và xuất lại mã QR nếu khách cần.', image: images['Quầy vé'] },
  { title: 'Liên hệ', text: 'Hotline 1900 1234. Quầy mở trước suất chiếu đầu tiên trong ngày 30 phút.', image: images['Liên hệ'] },
]

const remote = ref(null)

onMounted(async () => {
  try {
    const data = await apiFetch('/api/site-pages')
    if (data?.about) remote.value = data.about
  } catch {
    remote.value = null
  }
})

const lead = computed(() => remote.value?.lead || fallbackLead)
const cards = computed(() => {
  const items = remote.value?.items
  if (!items?.length) return fallback
  return items.map((item) => ({
    title: item.title,
    text: item.body,
    image: item.imageUrl || images[item.title],
  }))
})
</script>

<template>
  <section class="info-page">
    <p class="info-kicker">NATIONAL CINEMA</p>
    <h1>Giới thiệu</h1>
    <p class="info-lead">{{ lead }}</p>
    <div class="info-grid">
      <article v-for="item in cards" :key="item.title" class="info-card">
        <img v-if="item.image" :src="item.image" :alt="item.title" />
        <div class="info-body">
          <h2>{{ item.title }}</h2>
          <p>{{ item.text }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
