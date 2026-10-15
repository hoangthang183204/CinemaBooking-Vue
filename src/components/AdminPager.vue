<script setup>
const props = defineProps({
  page: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  total: { type: Number, required: true },
})

const emit = defineEmits(['update:page'])

const from = () => (props.page - 1) * 10 + 1
const to = () => Math.min(props.page * 10, props.total)

function go(next) {
  if (next < 1 || next > props.pageCount || next === props.page) return
  emit('update:page', next)
}
</script>

<template>
  <nav v-if="total > 10" class="pager" aria-label="Phân trang">
    <span>{{ from() }}–{{ to() }} / {{ total }}</span>
    <div class="pager-actions">
      <button type="button" :disabled="page <= 1" @click="go(page - 1)">Trước</button>
      <span>{{ page }} / {{ pageCount }}</span>
      <button type="button" :disabled="page >= pageCount" @click="go(page + 1)">Sau</button>
    </div>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 0.85rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.pager-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.pager button {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  font-family: inherit;
}
.pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
