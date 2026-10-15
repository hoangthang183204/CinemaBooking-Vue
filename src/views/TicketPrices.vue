<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../api'

const fallbackLead = 'Giá trên website là giá đã gồm ghế bạn chọn. Đơn online chưa áp dụng mã giảm giá.'
const fallbackRows = [
  { title: 'Thường, VIP, ghế đôi', meta: 'Đặt online', extra: '75.000đ / ghế' },
  { title: 'Bán tại quầy', meta: 'Tiền mặt, chuyển khoản, thẻ', extra: 'Nhân viên xác nhận khi thu tiền' },
]
const noteImages = {
  'Giữ ghế': 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=80',
  'Số ghế mỗi đơn': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
}
const fallbackNotes = [
  { title: 'Giữ ghế', text: 'Sau khi chọn ghế, hệ thống giữ trong 10 phút. Hết giờ ghế được mở lại cho khách khác.', image: noteImages['Giữ ghế'] },
  { title: 'Số ghế mỗi đơn', text: 'Tối đa 8 ghế cho một lần đặt, kể cả ghế đôi. Ghế đôi tính theo từng chỗ ngồi.', image: noteImages['Số ghế mỗi đơn'] },
]

const remote = ref(null)

onMounted(async () => {
  try {
    const data = await apiFetch('/api/site-pages')
    if (data?.prices) remote.value = data.prices
  } catch {
    remote.value = null
  }
})

const lead = computed(() => remote.value?.lead || fallbackLead)
const rows = computed(() => (remote.value?.items?.length ? remote.value.items : fallbackRows))
const notes = computed(() => {
  const items = remote.value?.notes
  if (!items?.length) return fallbackNotes
  return items.map((item) => ({
    title: item.title,
    text: item.body,
    image: item.imageUrl || noteImages[item.title],
  }))
})
</script>

<template>
  <section class="info-page">
    <p class="info-kicker">NATIONAL CINEMA</p>
    <h1>Giá vé</h1>
    <p class="info-lead">{{ lead }}</p>

    <div class="info-block">
      <table class="price-table">
        <thead>
          <tr>
            <th>Loại ghế</th>
            <th>Kênh</th>
            <th>Giá</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.title">
            <td>{{ row.title }}</td>
            <td>{{ row.meta }}</td>
            <td>{{ row.extra }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="info-grid" style="margin-top: 1rem">
      <article v-for="item in notes" :key="item.title" class="info-card">
        <img v-if="item.image" :src="item.image" :alt="item.title" />
        <div class="info-body">
          <h2>{{ item.title }}</h2>
          <p>{{ item.text }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
