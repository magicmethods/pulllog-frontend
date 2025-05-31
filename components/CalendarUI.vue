<script setup lang="ts">
import type { DatePickerPassThroughOptions } from 'primevue'

// Props
const props = defineProps<{
    modelValue: CalenderDate
    id?: string
    name?: string
    label?: string
    commit?: boolean
    commitLabel?: string
    defaultDate?: Date
    minDate?: Date
    maxDate?: Date
    timeOnly?: boolean
    customIcon?: string
    withFooter?: boolean
    pt?: PassThroughValue
    containerClass?: string
    containerStyle?: string
}>()

// Emits
const emit = defineEmits<{
    (e: 'update:modelValue', value: CalenderDate): void
    (e: 'commit', value: CalenderDate): void
}>()

// State
const internalDate = ref<CalenderDate>(props.modelValue ?? props.defaultDate ?? null)
//const currentDate = ref<CalenderDate>(props.modelValue ?? props.defaultDate ?? null)
const passThroughOptions = computed(() => {
    return (props.pt ? { ...props.pt } : {}) as DatePickerPassThroughOptions
})

// Methods
function commitValue() {
    if (internalDate.value !== null) {
        emit('update:modelValue', internalDate.value)
        emit('commit', internalDate.value)
    }
}
/*
const handleCommit = (event: Event) => {
   if (currentDate.value) {
        emit('commit', currentDate.value)
    }
}
*/

// Lifecycle Hooks
onMounted(() => {
    // マウント時に初期コミット
    if (internalDate.value !== null && !props.commit) {
        emit('update:modelValue', internalDate.value)
        emit('commit', internalDate.value)
    }
})

// Watches
watch(() => props.modelValue, val => {
    // props.modelValue（親） → internalDate（子）へ反映
    if (val !== internalDate.value) internalDate.value = val
})
watch(() => internalDate.value, val => {
    // internalDate（子） → modelValue（親）へ反映
    if (props.commit) return // commit が true の場合は emit しない
    if (val === null || val === props.modelValue) return // null または modelValue と同じ場合は emit しない
    emit('update:modelValue', val)
    emit('commit', val)
})
/*
watch(
    () => currentDate.value,
    newValue => {
        // currentDate（子） → 親へ emit（commit が false または未定義時のみ）
        emit('update:modelValue', newValue)
        if (props.commit) return // commit が true の場合は emit しない
        if (newValue === null) return // null の場合は emit しない
        if (newValue === props.modelValue) return // modelValue と同じ場合は emit しない
        if (newValue instanceof Date && Number.isNaN(newValue.getTime())) return // 無効な日付の場合は emit しない
        emit('commit', newValue)
    }
)
*/
</script>

<template>
    <div :class="props.containerClass" :style="props.containerStyle">
        <h3 v-if="props.label" :for="props.id ?? 'calendar-date'">{{ props.label }}</h3>
        <div class="flex justify-start items-center gap-2 w-full">
            <DatePicker
                v-model="internalDate"
                :id="props.id ?? 'calendar-date'"
                :name="props.name ?? 'calendar_date'"
                showIcon
                :showButtonBar="props.timeOnly ? false : props.withFooter"
                iconDisplay="input"
                :defaultValue="props.timeOnly ? null : props.defaultDate"
                :minDate="props.timeOnly ? undefined : props.minDate"
                :maxDate="props.timeOnly ? undefined : props.maxDate"
                :timeOnly="props.timeOnly ?? false"
                :manualInput="!props.timeOnly"
                :dateFormat="props.timeOnly ? undefined : 'yy-mm-dd'"
                :placeholder="props.timeOnly ? 'HH:MM' : 'YYYY-MM-DD'"
                :pt="passThroughOptions"
            >
                <template #inputicon="slotProps">
                    <span v-if="props.customIcon" @click="slotProps.clickCallback">{{ props.customIcon }}</span>
                </template>
            </DatePicker>
            <Button
                v-if="props.commit"
                :label="props.commitLabel ?? 'Commit'"
                class="btn btn-primary w-36 max-w-max px-4 py-2 text-base! m-0!"
                :disabled="!internalDate"
                @click="commitValue"
                v-blur-on-click
            />
            <!-- div class="w-full"></div -->
        </div>
    </div>
</template>