import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useVirtualScroll(
  allRows: () => unknown[],
  rowHeight = 36,
  buffer = 5,
) {
  const containerRef = ref<HTMLElement | null>(null)
  const scrollTop = ref(0)
  const containerHeight = ref(600)

  const visibleCount = computed(
    () => Math.ceil(containerHeight.value / rowHeight) + buffer * 2,
  )

  const startIndex = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / rowHeight) - buffer),
  )

  const endIndex = computed(() =>
    Math.min(allRows().length, startIndex.value + visibleCount.value),
  )

  const visibleRows = computed(() =>
    allRows().slice(startIndex.value, endIndex.value),
  )

  const totalHeight = computed(() => allRows().length * rowHeight)
  const offsetY = computed(() => startIndex.value * rowHeight)

  function onScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop
  }

  function updateContainerHeight() {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
      resizeObserver = new ResizeObserver(updateContainerHeight)
      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  return {
    containerRef,
    visibleRows,
    totalHeight,
    offsetY,
    startIndex,
    onScroll,
  }
}
