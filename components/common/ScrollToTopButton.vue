<script setup lang="ts">
import { debounce } from '~/utils/timing'

// Props
const props = defineProps<{
    target?: HTMLElement | null
    threshold?: number
}>()

// Refs & Local variables
const scrollEl = computed(() => props.target ?? null)
const isVisible = ref<boolean>(false)
const threshold = props.threshold ?? 200

// Methods
const handleScroll = debounce(() => {
    //console.log('ScrollToTopButton handleScroll', scrollEl.value?.scrollTop, window.scrollY)
    const scrollTop = scrollEl.value?.scrollTop ?? window.scrollY
    isVisible.value = scrollTop > threshold
}, 100)
function scrollToTop() {
    const moving: ScrollToOptions = { top: 0, behavior: 'smooth' }
    if (scrollEl.value) {
        scrollEl.value.scrollTo(moving)
    } else {
        window.scrollTo(moving)
    }
}
function bindScrollEvent() {
    if (scrollEl.value) {
        scrollEl.value.addEventListener('scroll', handleScroll, { passive: true })
    } else {
        window.addEventListener('scroll', handleScroll, { passive: true })
    }
}
function unbindScrollEvent() {
    if (scrollEl.value) {
        scrollEl.value.removeEventListener('scroll', handleScroll)
    } else {
        window.removeEventListener('scroll', handleScroll)
    }
}

// Lifecycle hooks
onMounted(() => {
    //console.debug('ScrollToTopButton mounted', props.target, scrollEl.value)
    bindScrollEvent()
    handleScroll() // 初期状態のチェック
})
onUnmounted(() => {
    unbindScrollEvent()
})

// Watchers
// targetが切り替わったとき
watch(scrollEl, (newEl, oldEl) => {
    if (oldEl && oldEl instanceof HTMLElement) oldEl.removeEventListener('scroll', handleScroll)
    if (newEl && newEl instanceof HTMLElement) newEl.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // 新しい要素の初期状態チェック
})

</script>

<template>
    <Button
        v-if="isVisible"
        icon="pi pi-arrow-up"
        rounded
        class="btn-floating-action"
        @click="scrollToTop"
        aria-label="トップへ戻る"
    />
</template>
