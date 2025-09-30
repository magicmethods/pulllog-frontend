const MD_BREAKPOINT = 768
const LG_BREAKPOINT = 1024

/**
 * ブレークポイントに応じたレイアウト判定を提供する。
 */
export function useBreakpoint() {
    const width = ref<number>(0)
    const isClient = ref<boolean>(false)

    function updateWidth() {
        width.value = window.innerWidth
    }

    onMounted(() => {
        isClient.value = true
        updateWidth()
        window.addEventListener("resize", updateWidth, { passive: true })
    })

    onBeforeUnmount(() => {
        window.removeEventListener("resize", updateWidth)
    })

    const isMd = computed(() => width.value >= MD_BREAKPOINT)
    const isLg = computed(() => width.value >= LG_BREAKPOINT)

    return {
        width,
        isClient,
        isMd,
        isLg,
    }
}
