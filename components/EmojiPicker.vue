<script setup lang="ts">

// Props & Emit
const props = defineProps<{
    target: HTMLElement | null // 表示位置の基準要素
    modalId?: string // モーダル内で使用する場合はモーダル要素のID
    id?: string
}>()
const emit = defineEmits<{
    (e: 'select', emoji: string): void
    (e: 'close'): void
}>()

// State & Refs
const pickerRef = ref<HTMLElement | null>(null)
const position = ref<'top' | 'bottom'>('bottom')
const left = ref('0px')
const top = ref('0px')

// 絵文字リスト（8 ✕ n / 拡張可）
const emojis = [
    '😀', '😂', '😍', '🥺', '👍', '🎉', '💡', '🔥',
    '⚜️', '⭐', '🌟', '🚀', '🌈', '🏆', '🎯', '💬',
    '💖', '💔', '⏫', '🔔', '🔒', '🔑', '🔗','📌',
]

// Methods
function handleSelect(emoji: string) {
    emit('select', emoji)
    emit('close')
}

function clickOutside(e: MouseEvent) {
    if (pickerRef.value && !pickerRef.value.contains(e.target as Node)) {
        emit('close')
    }
}

// Lifecycle Hooks
onMounted(async () => {
    await nextTick()
    document.addEventListener('click', clickOutside)

    const targetEl = props.target// ?? document.getElementById(props.targetId ?? '')
    const pickerEl = pickerRef.value
    if (!targetEl || !pickerEl) return

    const rect = targetEl.getBoundingClientRect()
    // rect.top/left: ビューポート（画面）内の絶対座標
    // rect.bottom: ビューポート上での下端座標
    let modalRect = null
    if (props.modalId) {
        modalRect = document.getElementById(props.modalId)?.getBoundingClientRect()
    }

    // Approximate: Math.ceil(emojis.length / 8) (line) * 40 (symbol + gap) + 16 (padding) + 2 (border)
    const pickerHeight = Math.ceil(emojis.length / 8) * 40 + 16 + 2

    // ビューポート下端までのスペース
    // const spaceBelow = window.innerHeight - (targetEl.offsetTop + targetEl.offsetHeight)
    const spaceBelow = modalRect ? modalRect.bottom - rect.bottom : window.innerHeight - rect.bottom
    // const spaceAbove = targetEl.offsetTop
    const spaceAbove = modalRect ? rect.top - modalRect.top : rect.top

    position.value = spaceBelow > pickerHeight ? 'bottom' : 'top'
    if (modalRect) {
        // モーダル内での位置調整
        const leftInModal = rect.left - modalRect.left
        const topInModal = rect.top - modalRect.top
        const bottomInModal = rect.bottom - modalRect.top
        left.value = `${leftInModal}px`
        top.value = position.value === 'bottom'
            ? `${bottomInModal}px`
            : `${topInModal - pickerHeight}px`
    } else {
        // ビューポート内での位置調整
        // left.value = `${targetEl.offsetLeft}px`
        left.value = `${rect.left + window.scrollX}px`
        top.value = position.value === 'bottom'
            // ? `${targetEl.offsetTop + targetEl.offsetHeight}px`
            ? `${rect.bottom + window.scrollY}px`
            // : `${targetEl.offsetTop - pickerHeight}px`
            : `${rect.top + window.scrollY - pickerHeight}px`
    }
    //console.log('EmojiPicker mounted:', [targetEl], pickerHeight, spaceBelow, spaceAbove, position.value, left.value, top.value, window.scrollX, window.scrollY)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', clickOutside)
})

</script>

<template>
    <Teleport :to="props.target">
        <div
            ref="pickerRef"
            :id="props.id"
            class="emoji-picker absolute z-50 w-max rounded border border-surface-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-md dark:shadow-lg p-2 grid grid-cols-8 gap-1 text-lg"
            :style="{ top, left }"
        >
            <button
                v-for="emoji in emojis"
                :key="emoji"
                class="hover:bg-primary-200/60 dark:hover:bg-primary-700/30 rounded p-1"
                @click.stop="handleSelect(emoji)"
            >
                {{ emoji }}
            </button>
        </div>
    </Teleport>
</template>
