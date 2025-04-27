<script setup lang="ts">

// Types
type CalenderDate = Date | Date[] | (Date | null)[] | null | undefined

// Props
const props = defineProps<{
    modelValue: CalenderDate
    label?: string
    commit?: boolean
    commitLabel?: string
    defaultDate?: Date
    minDate?: Date
    maxDate?: Date
    timeOnly?: boolean
    customIcon?: string
    withFooter?: boolean
    panelClass?: string
}>()

// Emits
const emit = defineEmits<{
    (e: 'update:modelValue', value: CalenderDate): void
    (e: 'commit', value: CalenderDate): void
}>()

// Refs & Local variables
const currentDate = ref<CalenderDate>(props.modelValue ?? props.defaultDate ?? null)

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

// Pass Through
const datePickerPT = {
  root: {
    class: 'w-max',
    style: 'min-width: 10rem;',
  },
  pcinputtext: { root: 'w-full border rounded px-3 py-2 border-surface dark:border-gray-700 focus:ring-2 dark:bg-gray-950 focus:ring-primary-200/50 focus:dark:ring-primary-800/40 outline-none disabled:bg-surface-200/50 disabled:text-surface-600/50' },
  inputIconContainer: 'absolute right-2 top-1/2 -translate-y-1/2',
  panel: `w-max border rounded-md border-surface-200 dark:border-gray-700 shadow-lg ${props.panelClass ?? ''}`,
  calendarContainer: 'w-full rounded-md dark:bg-gray-800/50',
  calender: 'w-full p-0',
  header: 'flex items-center justify-between mt-1 p-1 pt-0 border-b border-surface-200 dark:border-gray-700 dark:bg-gray-800/50',
  pcprevbutton: { root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40' },
  selectMonth: 'mr-0.5 px-3 py-2 rounded hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
  selectYear: 'ml-0.5 px-3 py-2 rounded hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
  decade: 'px-3 py-2 rounded hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
  pcNextButton: { root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40' },
  dayView: {
    class: 'table-auto border-collapse',
    style: '--p-datepicker-date-selected-background: var(--p-primary-400); --p-datepicker-date-selected-color: #fff;',
  },
  tableHeaderRow: 'text-sm font-semibold text-surface-500 border-b border-surface bg-surface-100 dark:bg-gray-600/40',
  tableHeaderCell: 'w-1/7 py-1 border-r border-surface text-center last:border-0 first:bg-rose-200/50 first:dark:bg-rose-600/40 last:bg-blue-200/50 last:dark:bg-blue-600/40',
  tableBodyRow: 'text-sm font-semibold text-surface-500 border-b border-surface last:border-0',
  dayCell: 'w-1/7 p-0 border-r border-surface text-center last:border-0 hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
  day: {
    class: 'mx-auto rounded-none text-sm font-semibold hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
    style: 'width: calc(100% + 2px);',
  },
  monthView: {
    class: 'flex flex-wrap justify-evenly gap-0.5 m-0.5',
    style: '--p-datepicker-date-selected-background: var(--p-primary-400); --p-datepicker-date-selected-color: #fff;',
  },
  month: 'flex items-center justify-center w-1/4 h-8 rounded text-sm font-semibold hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
  yearView: {
    class: 'flex flex-wrap justify-evenly gap-0.5 m-0.5',
    style: '--p-datepicker-date-selected-background: var(--p-primary-400); --p-datepicker-date-selected-color: #fff;',
  },
  year: 'flex items-center justify-center w-1/3 h-8 rounded text-sm font-semibold hover:bg-primary-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40',
  pcIncrementButton: { root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40' },
  pcDecrementButton: { root: 'p-1 rounded-full hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40' },
  buttonbar: 'flex items-center justify-between p-1 border-t border-surface-200 dark:border-gray-700 dark:bg-gray-800/50',
  pcTodayButton: { root: 'px-3 py-1.5 rounded-md hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40' },
  pcClearButton: { root: 'px-3 py-1.5 rounded-md hover:bg-surface-200/50 hover:text-primary disabled:text-surface-600/50 dark:hover:bg-gray-700/40' },
}

</script>

<template>
    <div>
        <h3 v-if="props.label" class="text-primary-600 dark:text-primary-500 mb-1 font-semibold">{{ props.label }}</h3>
        <div class="flex items-center space-x-2">
            <DatePicker
                v-model="currentDate"
                name="target_date"
                showIcon
                :showButtonBar="props.withFooter"
                iconDisplay="input"
                :defaultValue="props.defaultDate"
                :minDate="props.minDate"
                :maxDate="props.maxDate"
                :timeOnly="props.timeOnly ?? false"
                dateFormat="yy-mm-dd"
                placeholder="YYYY-MM-DD"
                :pt="datePickerPT"
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