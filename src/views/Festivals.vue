<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../api'

const fallbackLead = 'Lịch sự kiện của National Cinema Center. Suất nào mở bán online sẽ xuất hiện trong Lịch chiếu.'
const images = {
  'Tuần phim cuối tháng': 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=900&q=80',
  'Tuần phim hoạt hình': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80',
  'Suất đặc biệt tại rạp': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=900&q=80',
}
const fallback = [
  {
    meta: '20–26.10.2026',
    title: 'Tuần phim cuối tháng',
    text: 'Các suất tối trong tuần được xếp thêm tại phòng 1. Xem giờ cụ thể ở Lịch chiếu.',
    image: images['Tuần phim cuối tháng'],
  },
  {
    meta: '02–08.11.2026',
    title: 'Tuần phim hoạt hình',
    text: 'Suất sáng dành cho gia đình. Vé vẫn đặt trên web theo giá niêm yết.',
    image: images['Tuần phim hoạt hình'],
  },
  {
    meta: 'Cả năm',
    title: 'Suất đặc biệt tại rạp',
    text: 'Một số buổi giới thiệu phim chỉ bán tại quầy. Nhân viên sẽ thông báo khi suất không mở online.',
    image: images['Suất đặc biệt tại rạp'],
  },
]

const remote = ref(null)

onMounted(async () => {
  try {
    const data = await apiFetch('/api/site-pages')
    if (data?.festivals) remote.value = data.festivals
  } catch {
    remote.value = null
  }
})

const lead = computed(() => remote.value?.lead || fallbackLead)
const events = computed(() => {
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
    <h1>Liên hoan phim, Tuần phim</h1>
    <p class="info-lead">{{ lead }}</p>
    <div class="info-grid">
      <article v-for="item in events" :key="item.title" class="info-card">
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
