<script setup lang="ts">
import type { DatePickerPassThroughOptions } from 'primevue';

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
    containerStyle?: string
}>()

// Emits
const emit = defineEmits<{
    (e: 'update:modelValue', value: CalenderDate): void
    (e: 'commit', value: CalenderDate): void
}>()

// Refs & Local variables
const currentDate = ref<CalenderDate>(props.modelValue ?? props.defaultDate ?? null)
const passThroughOptions = computed(() => {
    return (props.pt ? { ...props.pt } : {}) as DatePickerPassThroughOptions
})

// Methods
const handleCommit = (event: Event) => {
   if (currentDate.value) {
        emit('commit', currentDate.value)
    }
}

// Lifecycle Hooks
onMounted(() => {
    // マウント時に初期コミット
    if (currentDate.value !== null) {
        emit('update:modelValue', currentDate.value)
    }
})

// Watches
watch(
    () => props.modelValue,
    newValue => {
        // props.modelValue（親） → currentDate（子）へ反映
        if (newValue !== undefined) {
            currentDate.value = newValue
        }
    }
)
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

</script>

<template>
    <div :style="props.containerStyle ?? ''">
        <h3 v-if="props.label" :for="props.id ?? 'target_date'">{{ props.label }}</h3>
        <div class="flex items-center space-x-2">
            <DatePicker
                v-model="currentDate"
                :id="props.id ?? 'target_date'"
                :name="props.name ?? 'target_date'"
                showIcon
                :showButtonBar="props.withFooter"
                iconDisplay="input"
                :defaultValue="props.defaultDate"
                :minDate="props.minDate"
                :maxDate="props.maxDate"
                :timeOnly="props.timeOnly ?? false"
                :dateFormat="props.timeOnly ? '@' : 'yy-mm-dd'"
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
                :disabled="!currentDate"
                @click="handleCommit"
                v-blur-on-click
            />
            <div class="w-full"></div>
        </div>
    </div>
</template>