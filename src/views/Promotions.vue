<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../api'

const fallbackLead = 'Ưu đãi đang công bố. Chỉ mức giá ghi trên màn thanh toán mới là số tiền của đơn online.'
const images = {
  'Đồng giá vé 75.000đ': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
  'Combo bắp nước 79.000đ': 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=900&q=80',
  'Suất ngày thường tại quầy': 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80',
}
const fallback = [
  {
    meta: 'ONLINE',
    title: 'Đồng giá vé 75.000đ',
    text: 'Mọi ghế trên web đang tính 75.000đ. Giá này đã áp dụng khi bạn xác nhận đặt vé.',
    image: images['Đồng giá vé 75.000đ'],
  },
  {
    meta: 'QUẦY',
    title: 'Combo bắp nước 79.000đ',
    text: 'Mua kèm vé tại quầy. Combo không trừ vào đơn thanh toán online.',
    image: images['Combo bắp nước 79.000đ'],
  },
  {
    meta: 'THỨ HAI',
    title: 'Suất ngày thường tại quầy',
    text: 'Một số suất 2D bán tại quầy có giá ưu đãi. Nhân viên thông báo trước khi thu tiền.',
    image: images['Suất ngày thường tại quầy'],
  },
]

const remote = ref(null)

onMounted(async () => {
  try {
    const data = await apiFetch('/api/site-pages')
    if (data?.promotions) remote.value = data.promotions
  } catch {
    remote.value = null
  }
})

const lead = computed(() => remote.value?.lead || fallbackLead)
const offers = computed(() => {
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
    <h1>Khuyến mãi</h1>
    <p class="info-lead">{{ lead }}</p>
    <div class="info-grid">
      <article v-for="item in offers" :key="item.title" class="info-card">
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
