import { computed, ref, watch } from 'vue'

export const PAGE_SIZE = 10

export function usePager(source) {
  const page = ref(1)
  const total = computed(() => source.value?.length ?? 0)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
  const items = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return (source.value || []).slice(start, start + PAGE_SIZE)
  })

  watch(
    () => (source.value || []).map((row) => row?.id ?? '').join(','),
    () => {
      page.value = 1
    },
  )

  watch(pageCount, (count) => {
    if (page.value > count) page.value = count
  })

  return { page, pageCount, total, items }
}
