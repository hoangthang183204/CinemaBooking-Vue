<script setup>
import { onMounted, ref } from 'vue'
import { useToast } from '../../composables/useToast'
import { apiFetch } from '../../api'

const toast = useToast()
const form = ref({
  seatPrice: 75000,
  openTime: '08:00',
  closeTime: '23:30',
  weekendSurcharge: 0,
  lateShowSurcharge: 0,
  lateShowAfter: '21:00',
  lowStockAlert: 10,
})
const loading = ref(true)
const saving = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    form.value = await apiFetch('/api/admin/settings')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    form.value = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(form.value),
    })
    toast.success('Đã lưu cấu hình rạp')
  } catch (e) {
    error.value = e.message
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Cấu hình hệ thống</h2>
        <p class="page-sub">Giờ mở cửa, giá vé và phụ thu. Suất chiếu ngoài khung giờ sẽ không tạo được.</p>
      </div>
      <button class="btn" type="button" :disabled="saving || loading" @click="save">
        {{ saving ? 'Đang lưu...' : 'Lưu cấu hình' }}
      </button>
    </div>
    <p v-if="loading" class="state">Đang tải...</p>
    <form v-else class="grid" @submit.prevent="save">
      <label class="field">
        <span>Giá vé mỗi ghế</span>
        <strong>Đồng giá online</strong>
        <input v-model.number="form.seatPrice" type="number" min="0" />
        <small>đ / ghế</small>
      </label>
      <label class="field">
        <span>Giờ mở cửa</span>
        <strong>Suất sớm nhất</strong>
        <input v-model="form.openTime" type="time" />
        <small>Giờ địa phương</small>
      </label>
      <label class="field">
        <span>Giờ đóng cửa</span>
        <strong>Suất muộn nhất</strong>
        <input v-model="form.closeTime" type="time" />
        <small>Giờ địa phương</small>
      </label>
      <label class="field">
        <span>Phụ thu cuối tuần</span>
        <strong>Thứ 7 và Chủ nhật</strong>
        <input v-model.number="form.weekendSurcharge" type="number" min="0" />
        <small>đ / ghế</small>
      </label>
      <label class="field">
        <span>Phụ thu suất tối</span>
        <strong>Cộng thêm mỗi ghế</strong>
        <input v-model.number="form.lateShowSurcharge" type="number" min="0" />
        <small>đ / ghế</small>
      </label>
      <label class="field">
        <span>Suất tối tính từ</span>
        <strong>Mốc giờ phụ thu</strong>
        <input v-model="form.lateShowAfter" type="time" />
        <small>Từ giờ này trở đi</small>
      </label>
      <label class="field wide">
        <span>Cảnh báo bắp nước</span>
        <strong>Hiện trên Dashboard khi tồn kho xuống mức này</strong>
        <input v-model.number="form.lowStockAlert" type="number" min="0" />
        <small>số phần còn lại</small>
      </label>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 1.1rem; }
.page-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.page-title { margin: 0; }
.page-sub, .state { color: var(--text-muted); margin: 0.3rem 0 0; }
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}
.field {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 0.35rem;
  min-height: 168px;
  padding: 1rem 1.05rem;
  background: #141414;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
}
.field.wide { grid-column: span 3; grid-template-columns: 180px 1fr 220px auto; grid-template-rows: auto; align-items: center; min-height: 0; }
.field span { color: #fca5a5; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.field strong { color: #fff; font-size: 0.95rem; }
.field small { color: var(--text-muted); }
.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: #0b0b0b;
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
}
.btn {
  background: var(--accent-red); color: #fff; border: none; border-radius: 10px;
  padding: 0.75rem 1.15rem; cursor: pointer; font-family: inherit; font-weight: 700;
}
.btn:disabled { opacity: 0.6; cursor: default; }
.error { grid-column: 1 / -1; color: #fca5a5; margin: 0; }
@media (max-width: 980px) {
  .grid { grid-template-columns: 1fr 1fr; }
  .field.wide { grid-column: span 2; grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .page-head { flex-direction: column; align-items: stretch; }
  .grid, .field.wide { grid-template-columns: 1fr; }
  .field.wide { grid-column: auto; }
}
</style>
