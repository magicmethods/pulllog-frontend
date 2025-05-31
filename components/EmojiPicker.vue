<script setup lang="ts">

// Props & Emit
const props = defineProps<{
    target: HTMLElement | null // 表示位置の基準要素
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

    // Approximate: Math.ceil(emojis.length / 8) (line) * 40 (symbol + gap) + 16 (padding) + 2 (border)
    const pickerHeight = Math.ceil(emojis.length / 8) * 40 + 16 + 2
    const spaceBelow = window.innerHeight - (targetEl.offsetTop + targetEl.offsetHeight)
    const spaceAbove = targetEl.offsetTop

    position.value = spaceBelow > pickerHeight ? 'bottom' : 'top'

    left.value = `${targetEl.offsetLeft}px`
    top.value = position.value === 'bottom'
        ? `${targetEl.offsetTop + targetEl.offsetHeight}px`
        : `${targetEl.offsetTop - pickerHeight}px`

    console.log('EmojiPicker mounted:', [targetEl], pickerHeight, spaceBelow, spaceAbove, position.value, left.value, top.value)
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
