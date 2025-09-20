<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
    span: number
}>()

const TOTAL_SEGMENTS = 6
const SEGMENT_GAP = 2
const SEGMENT_WIDTH = 10
const SEGMENT_HEIGHT = 12
const VIEWBOX_WIDTH =
    TOTAL_SEGMENTS * SEGMENT_WIDTH + (TOTAL_SEGMENTS - 1) * SEGMENT_GAP
const VIEWBOX_HEIGHT = SEGMENT_HEIGHT + 4

const filledColor = "var(--primary-color, #6366f1)"
const emptyColor = "var(--surface-100, #f3f4f6)"
const borderColor = "var(--surface-border, #d1d5db)"

const segments = computed(() => {
    const span = Math.min(Math.max(props.span, 2), TOTAL_SEGMENTS)
    return Array.from({ length: TOTAL_SEGMENTS }, (_, index) => index < span)
})
</script>

<template>
    <svg
        :viewBox="`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`"
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-[72px] tile-size-preview"
        fill="none"
        role="img"
        aria-hidden="true"
    >
        <g v-for="(active, index) in segments" :key="index">
            <rect
                :x="index * (SEGMENT_WIDTH + SEGMENT_GAP)"
                y="1"
                :width="SEGMENT_WIDTH"
                :height="SEGMENT_HEIGHT"
                :rx="2"
                :ry="2"
                :fill="active ? filledColor : emptyColor"
                :stroke="borderColor"
                stroke-width="1"
            />
        </g>
    </svg>
</template>
