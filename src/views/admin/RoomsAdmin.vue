<script setup>
import { computed, ref, onMounted } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import AdminPager from '../../components/AdminPager.vue'
import { useToast } from '../../composables/useToast'
import { usePager } from '../../composables/usePager'
import { apiFetch } from '../../api'

const toast = useToast()

const list = ref([])
const { page, pageCount, total, items: pageItems } = usePager(list)
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')

const form = ref({
  name: '',
  rows: 5,
  seatsPerRow: 8,
  coupleRows: 1,
})

const layoutOpen = ref(false)
const layoutRoom = ref(null)
const layoutSeats = ref([])
const layoutSaving = ref(false)

const layoutRows = computed(() => {
  const byRow = new Map()
  for (const s of layoutSeats.value) {
    const letter = (s.seatNumber || '')[0] || '?'
    if (!byRow.has(letter)) byRow.set(letter, [])
    byRow.get(letter).push(s)
  }
  return [...byRow.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, seats]) => {
      const ordered = seats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }))
      const items = []
      for (let i = 0; i < ordered.length; i += 1) {
        const current = ordered[i]
        const next = ordered[i + 1]
        if (current.seatType === 2 && next?.seatType === 2 && !current.isBlocked && !next.isBlocked) {
          items.push({ kind: 'couple', key: `${current.id}-${next.id}`, seats: [current, next] })
          i += 1
        } else {
          items.push({ kind: 'single', key: String(current.id), seats: [current] })
        }
      }
      return { letter, items }
    })
})

async function fetchList() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch('/api/admin/rooms')
    list.value = data ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', rows: 5, seatsPerRow: 8, coupleRows: 1 }
  formError.value = ''
  showModal.value = true
}

function openEdit(room) {
  editing.value = room
  form.value = { name: room.name, rows: 5, seatsPerRow: 8, coupleRows: 1 }
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  formError.value = ''
}

async function save() {
  formError.value = ''
  if (!form.value.name.trim()) {
    formError.value = 'Tên phòng không được rỗng'
    toast.warning('Vui lòng nhập tên phòng')
    return
  }

  saving.value = true
  const isEdit = !!editing.value

  try {
    const path = isEdit
      ? `/api/admin/rooms/${editing.value.id}`
      : '/api/admin/rooms'
    const method = isEdit ? 'PUT' : 'POST'

    await apiFetch(path, {
      method,
      body: JSON.stringify({
        name: form.value.name.trim(),
        rows: Number(form.value.rows),
        seatsPerRow: Number(form.value.seatsPerRow),
        coupleRows: Number(form.value.coupleRows),
      }),
    })

    await fetchList()
    closeModal()
    toast.success(isEdit ? 'Cập nhật phòng thành công' : 'Thêm phòng thành công')
  } catch (e) {
    formError.value = e.message
    toast.error('Lỗi: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function remove(room) {
  if (!confirm(`Xóa phòng "${room.name}"?`)) return
  try {
    await apiFetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
    await fetchList()
    toast.success(`Đã xóa phòng "${room.name}"`)
  } catch (e) {
    toast.error('Không thể xóa: ' + e.message)
  }
}

async function openLayout(room) {
  layoutRoom.value = room
  layoutOpen.value = true
  try {
    const data = await apiFetch(`/api/admin/rooms/${room.id}/seats`)
    layoutSeats.value = data?.seats ?? []
  } catch (e) {
    toast.error(e.message)
    layoutSeats.value = []
  }
}

function cycleOne(seat) {
  if (seat.isBlocked) {
    seat.isBlocked = false
    seat.seatType = 0
    return
  }
  if (seat.seatType === 0) seat.seatType = 1
  else if (seat.seatType === 1) seat.seatType = 2
  else {
    seat.seatType = 0
    seat.isBlocked = true
  }
}

function cycleItem(item) {
  item.seats.forEach(cycleOne)
}

function itemClass(item) {
  if (item.seats.some((seat) => seat.isBlocked)) return 'blocked'
  if (item.kind === 'couple') return 'couple'
  if (item.seats[0].seatType === 1) return 'vip'
  return 'normal'
}

async function saveLayout() {
  if (!layoutRoom.value) return
  layoutSaving.value = true
  try {
    const data = await apiFetch(`/api/admin/rooms/${layoutRoom.value.id}/seats`, {
      method: 'PUT',
      body: JSON.stringify({ seats: layoutSeats.value }),
    })
    layoutSeats.value = data?.seats ?? layoutSeats.value
    toast.success('Đã lưu sơ đồ ghế')
    await fetchList()
  } catch (e) {
    toast.error(e.message)
  } finally {
    layoutSaving.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2 class="page-title">Quản lý phòng chiếu</h2>
        <p class="page-sub">{{ list.length }} phòng trong hệ thống</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <AppIcon name="plus" :size="18" />
        <span>Thêm phòng</span>
      </button>
    </div>

    <div v-if="loading" class="state">
      <div class="spinner" />
      <p>Đang tải...</p>
    </div>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <div v-else class="card-grid">
      <div v-for="r in pageItems" :key="r.id" class="room-card">
        <div class="room-card-head">
          <div class="room-icon">
            <AppIcon name="room" :size="24" />
          </div>
          <div class="room-actions">
            <button class="btn-icon" @click="openLayout(r)" title="Sơ đồ ghế">
              <AppIcon name="eye" :size="14" />
            </button>
            <button class="btn-icon" @click="openEdit(r)" title="Sửa">
              <AppIcon name="edit" :size="14" />
            </button>
            <button class="btn-icon danger" @click="remove(r)" title="Xóa">
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
        <h3 class="room-name">{{ r.name }}</h3>
        <button class="map-link" type="button" @click="openLayout(r)">Xem sơ đồ ghế</button>
        <div class="room-stats">
          <div class="stat">
            <span class="stat-label">Số ghế</span>
            <span class="stat-value">{{ r.seatCount }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Suất chiếu</span>
            <span class="stat-value">{{ r.showTimeCount }}</span>
          </div>
        </div>
      </div>
    </div>
    <AdminPager v-if="!loading && !error" v-model:page="page" :page-count="pageCount" :total="total" />

    <div v-if="layoutOpen" class="modal-backdrop" @click.self="layoutOpen = false">
      <div class="modal map-modal">
        <div class="modal-head">
          <h3>Sơ đồ ghế · {{ layoutRoom?.name }}</h3>
          <button class="modal-close" @click="layoutOpen = false">
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <p class="hint">Bấm từng ghế để đổi: thường → VIP → đôi → khóa. Ghế đôi hiện thành một cặp như lúc khách đặt vé.</p>
          <div class="seat-map-wrap">
            <div class="legend">
              <span class="legend-item"><i class="dot normal" /> Thường</span>
              <span class="legend-item"><i class="dot vip" /> VIP</span>
              <span class="legend-item"><i class="dot couple" /> Ghế đôi</span>
              <span class="legend-item"><i class="dot blocked" /> Khóa</span>
            </div>
            <div class="screen-wrap">
              <div class="screen-curve" />
              <span class="screen-label">MÀN HÌNH</span>
            </div>
            <div class="rows">
              <div v-for="row in layoutRows" :key="row.letter" class="row">
                <span class="row-label">{{ row.letter }}</span>
                <div class="seats-in-row">
                  <button
                    v-for="item in row.items"
                    :key="item.key"
                    type="button"
                    class="seat"
                    :class="itemClass(item)"
                    @click="cycleItem(item)"
                  >
                    <span v-if="item.kind === 'couple'" class="couple-seats">
                      <span class="couple-icon">♡</span>
                      <span>{{ item.seats[0].seatNumber }}–{{ item.seats[1].seatNumber }}</span>
                    </span>
                    <span v-else>{{ item.seats[0].seatNumber }}</span>
                  </button>
                </div>
                <span class="row-label">{{ row.letter }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" @click="layoutOpen = false">Đóng</button>
          <button class="btn btn-primary" :disabled="layoutSaving" @click="saveLayout">
            {{ layoutSaving ? 'Đang lưu...' : 'Lưu sơ đồ' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">
          <h3>{{ editing ? 'Sửa phòng' : 'Thêm phòng mới' }}</h3>
          <button class="modal-close" @click="closeModal">
            <AppIcon name="x" :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>Tên phòng <span class="required">*</span></label>
            <input v-model="form.name" type="text" placeholder="Ví dụ: Room 1" />
          </div>

          <template v-if="!editing">
            <div class="form-row-2">
              <div class="form-row">
                <label>Số hàng ghế</label>
                <input v-model.number="form.rows" type="number" min="1" max="20" />
              </div>
              <div class="form-row">
                <label>Ghế mỗi hàng</label>
                <input v-model.number="form.seatsPerRow" type="number" min="1" max="20" />
              </div>
            </div>
            <div class="form-row">
              <label>Số hàng ghế đôi (cuối cùng)</label>
              <input v-model.number="form.coupleRows" type="number" min="0" max="5" />
            </div>
            <div class="hint">
              <AppIcon name="ticket" :size="16" />
              <span>Hệ thống sẽ tự sinh ghế: hàng đầu là ghế thường, hàng cuối là ghế đôi.</span>
            </div>
          </template>

          <div v-else class="hint">
            <AppIcon name="ticket" :size="16" />
            <span>Không thể thay đổi layout ghế khi đang sửa phòng.</span>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" @click="closeModal">Hủy</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1.25rem; }

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}
.page-sub { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0 0; }

.state { padding: 3rem; text-align: center; color: var(--text-muted); }
.state.error { color: #f87171; }
.spinner {
  width: 40px; height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.room-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: all 0.2s;
}
.room-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-3px);
  box-shadow: var(--shadow-card);
}
.room-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.room-icon {
  width: 48px; height: 48px;
  background: rgba(229, 9, 20, 0.12);
  border: 1px solid rgba(229, 9, 20, 0.25);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fca5a5;
}
.room-actions { display: flex; gap: 0.35rem; }
.room-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.room-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-subtle);
}
.stat { display: flex; flex-direction: column; gap: 0.15rem; }
.stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--accent-gold);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.2s;
}
.btn-primary {
  background: var(--accent-red);
  color: #fff;
  box-shadow: var(--shadow-glow-red);
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-red-hover);
  transform: translateY(-1px);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}
.btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px; height: 30px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.btn-icon.danger:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.4);
  color: #f87171;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  backdrop-filter: blur(4px);
}
.modal {
  width: 100%;
  max-width: 500px;
  background: #141414;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.modal-head {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-head h3 { margin: 0; font-size: 1.1rem; color: var(--text-primary); font-weight: 700; }
.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.08); color: var(--text-primary); }

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-row { display: flex; flex-direction: column; gap: 0.45rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-row label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.required { color: #f87171; }
.form-row input {
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
}
.form-row input:focus {
  outline: none;
  border-color: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
}

.hint {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: #93c5fd;
  padding: 0.7rem 0.9rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-sm);
}
.hint svg { flex-shrink: 0; margin-top: 0.15rem; }

.form-error {
  color: #fca5a5;
  font-size: 0.85rem;
  padding: 0.7rem 0.9rem;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-sm);
  margin: 0;
}
.modal-foot {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.map-link {
  align-self: start;
  background: transparent;
  border: none;
  color: #fca5a5;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  font-weight: 600;
}
.map-modal { max-width: 860px; }
.seat-map-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.legend { display: flex; gap: 1.1rem; flex-wrap: wrap; justify-content: center; color: var(--text-muted); font-size: 0.82rem; }
.legend-item { display: flex; align-items: center; gap: 0.4rem; }
.dot { width: 14px; height: 14px; border-radius: 4px; }
.dot.normal { background: #334155; }
.dot.vip { background: #ca8a04; }
.dot.couple { width: 22px; background: #a855f7; border-radius: 4px 4px 2px 2px; }
.dot.blocked { background: #7f1d1d; }
.screen-wrap { width: 90%; max-width: 480px; text-align: center; }
.screen-curve {
  height: 24px;
  background: linear-gradient(to bottom, rgba(229, 9, 20, 0.4), transparent);
  border-top: 3px solid #e50914;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  box-shadow: 0 -8px 32px rgba(229, 9, 20, 0.35);
}
.screen-label {
  display: block; margin-top: 0.45rem; font-size: 0.75rem; letter-spacing: 0.4em; color: var(--text-muted); font-weight: 600;
}
.rows { display: flex; flex-direction: column; gap: 0.6rem; overflow-x: auto; max-width: 100%; padding: 0.25rem; }
.row { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
.row-label { width: 20px; text-align: center; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; }
.seats-in-row { display: flex; gap: 0.35rem; }
.seat {
  border: none; color: #fff; font-weight: 700; cursor: pointer; font-family: inherit; position: relative;
  transition: transform 0.15s ease;
}
.seat.normal, .seat.vip, .seat.blocked {
  width: 38px; height: 38px; border-radius: 8px 8px 4px 4px; font-size: 0.68rem;
}
.seat.normal { background: #334155; }
.seat.vip { background: #ca8a04; }
.seat.blocked { background: #7f1d1d; opacity: 0.55; }
.seat.couple {
  width: 86px; height: 44px; border-radius: 10px 10px 6px 6px; background: #a855f7; padding: 0;
}
.seat:hover { transform: translateY(-2px); }
.couple-seats { display: flex; align-items: center; justify-content: center; gap: 0.3rem; font-size: 0.68rem; }
.couple-icon { color: #fde68a; }
</style>