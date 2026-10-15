<script setup>
import { computed } from 'vue'

const props = defineProps({
  code: { type: [String, Number], required: true },
  movie: { type: String, default: '' },
  room: { type: String, default: '' },
  showTime: { type: String, default: '' },
  seats: { type: Array, default: () => [] },
  concessions: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  qrUrl: { type: String, default: '' },
  tickets: { type: Array, default: () => [] },
  channel: { type: String, default: 'web' },
  accountName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
})

const seatLines = computed(() =>
  (props.seats || []).map((seat) => ({
    name: `Vé ghế ${seat}`,
    qty: 1,
    price: 75000,
  }))
)

function money(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}₫`
}
</script>

<template>
  <article class="bill">
    <header>
      <p>NATIONAL CINEMA CENTER</p>
      <h2>Hóa đơn thanh toán</h2>
      <span>Mã đơn #{{ code }}</span>
    </header>

    <dl>
      <div><dt>Phim</dt><dd>{{ movie }}</dd></div>
      <div><dt>Phòng</dt><dd>{{ room }}</dd></div>
      <div><dt>Suất chiếu</dt><dd>{{ showTime }}</dd></div>
    </dl>

    <table>
      <thead>
        <tr>
          <th>Món</th>
          <th>SL</th>
          <th>Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in seatLines" :key="line.name">
          <td>{{ line.name }}</td>
          <td>{{ line.qty }}</td>
          <td>{{ money(line.price) }}</td>
        </tr>
        <tr v-for="item in concessions" :key="item.name">
          <td>{{ item.name }}</td>
          <td>{{ item.quantity }}</td>
          <td>{{ money(item.unitPrice * item.quantity) }}</td>
        </tr>
      </tbody>
    </table>

    <p class="total">Tổng {{ money(total) }}</p>

    <template v-if="qrUrl && !tickets.length">
      <img :src="qrUrl" alt="QR chuyển khoản" />
      <p class="qr-caption">QR chuyển khoản {{ money(total) }}</p>
      <p v-if="accountNumber" class="qr-caption">{{ accountName }} · {{ accountNumber }}</p>
      <p class="qr-caption">Nội dung chuyển khoản: VE {{ code }}</p>
    </template>
    <div v-if="tickets.length" class="ticket-row">
      <figure v-for="ticket in tickets" :key="ticket.seatNumber + ticket.qrImageUrl">
        <img :src="ticket.qrImageUrl" :alt="`QR ghế ${ticket.seatNumber}`" />
        <figcaption>Ghế {{ ticket.seatNumber }}</figcaption>
      </figure>
    </div>
    <p class="hint">
      {{
        tickets.length
          ? 'Đưa mã QR trên hóa đơn tại cửa soát vé.'
          : 'Quét QR bằng app ngân hàng. Giữ đúng số tiền và nội dung VE trên hóa đơn. Quầy tự nhận khi tiền vào.'
      }}
    </p>
  </article>
</template>

<style scoped>
.bill {
  width: min(420px, 100%);
  margin: 0 auto;
  background: #fff;
  color: #111;
  border-radius: 16px;
  padding: 1.25rem;
}
.bill header { text-align: center; }
.bill header p {
  margin: 0;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
}
.bill h2 { margin: 0.2rem 0; font-size: 1.25rem; }
.bill header span { color: #666; font-size: 0.85rem; }
dl { margin: 1rem 0; }
dl div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
  font-size: 0.9rem;
}
dt { color: #666; }
dd { margin: 0; text-align: right; font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
th, td { text-align: left; padding: 0.4rem 0; border-bottom: 1px solid #eee; }
th:last-child, td:last-child { text-align: right; }
.total {
  margin: 0.8rem 0;
  text-align: right;
  font-size: 1.15rem;
  font-weight: 800;
}
img { display: block; width: 220px; height: 220px; margin: 0.5rem auto 0.25rem; }
.qr-caption { margin: 0 0 0.6rem; text-align: center; font-weight: 800; }
.ticket-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.ticket-row figure { margin: 0; text-align: center; }
.ticket-row img { width: 140px; height: 140px; margin: 0 auto 0.25rem; }
.ticket-row figcaption { font-size: 0.8rem; font-weight: 700; }
.hint { margin: 0; text-align: center; color: #444; font-size: 0.85rem; }
</style>
