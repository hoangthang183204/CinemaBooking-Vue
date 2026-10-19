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
const codes = ref([])
const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const fallbackCodes = [
  { name: 'Thứ 3 vui vẻ', code: 'T3VUI', kind: 'Weekday', value: 20, weekday: 2, appliesTo: 'Ticket', note: 'Giảm 20% tiền ghế vào thứ Ba.' },
  { name: 'Combo bắp nước', code: 'COMBO10', kind: 'Percent', value: 10, appliesTo: 'Concession', note: 'Giảm 10% bắp nước, tối đa 20.000đ.' },
  { name: 'Mã sinh nhật', code: 'SINHNHAT', kind: 'Fixed', value: 30000, appliesTo: 'All', minSubtotal: 75000, note: 'Giảm 30.000đ cho đơn từ 75.000đ.' },
]

function offerText(item) {
  if (item.kind === 'Fixed') return `Giảm ${Number(item.value).toLocaleString('vi-VN')}đ`
  const day = item.kind === 'Weekday' ? `${weekdays[item.weekday] || ''} · ` : ''
  return `${day}Giảm ${item.value}%`
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    // Trình duyệt chặn sao chép thì khách vẫn đọc mã trên thẻ.
  }
}

function appliesText(item) {
  if (item.appliesTo === 'Ticket') return 'tiền ghế'
  if (item.appliesTo === 'Concession') return 'bắp nước'
  return 'cả đơn'
}

onMounted(async () => {
  try {
    const data = await apiFetch('/api/site-pages')
    if (data?.promotions) remote.value = data.promotions
  } catch {
    remote.value = null
  }
  try {
    const rows = await apiFetch('/api/promotions')
    codes.value = Array.isArray(rows) && rows.length ? rows : fallbackCodes
  } catch {
    codes.value = fallbackCodes
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
    <section class="code-board">
      <h2>Mã giảm giá</h2>
      <p>Mã được công bố tại đây. Khi đặt vé, chọn ghế rồi nhập mã vào ô <strong>Mã giảm giá</strong> trước khi bấm Xác nhận đặt vé. Số tiền giảm hiện ngay ở tạm tính. Mỗi mã chỉ dùng được 1 lần.</p>
      <div class="code-list">
        <article v-for="item in codes" :key="item.code || item.name" class="code-card">
          <div>
            <strong>{{ item.name }}</strong>
            <p>{{ offerText(item) }} · áp cho {{ appliesText(item) }}</p>
            <p v-if="item.note">{{ item.note }}</p>
            <p v-if="item.minSubtotal">Đơn tối thiểu {{ Number(item.minSubtotal).toLocaleString('vi-VN') }}đ</p>
          </div>
          <button v-if="item.code" type="button" class="code-chip" @click="copyCode(item.code)">
            {{ item.code }}
          </button>
          <span v-else class="code-chip quiet">Tự áp dụng</span>
        </article>
      </div>
    </section>
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

<style scoped>
.code-board { margin: 1.25rem 0 1.5rem; }
.code-board h2 { margin: 0 0 0.4rem; }
.code-board > p { color: var(--text-secondary); max-width: 720px; }
.code-list { display: grid; gap: 0.75rem; margin-top: 0.9rem; }
.code-card {
  display: flex; justify-content: space-between; gap: 1rem; align-items: center;
  padding: 0.9rem 1rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--bg-card);
}
.code-card p { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.88rem; }
.code-chip {
  border: 1px dashed var(--accent-red); background: rgba(229, 9, 20, 0.08); color: #fca5a5;
  border-radius: 10px; padding: 0.55rem 0.8rem; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer; font-family: inherit;
}
.code-chip.quiet { cursor: default; }
</style>
