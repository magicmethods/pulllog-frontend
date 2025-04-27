<script setup lang="ts">

// Props
const props = defineProps<{
    modelValue: string | null
    options: string[] | Record<string, string>[]
    optionLabel?: string
    filtering?: boolean
    order?: string
    defaultOptions?: string[] | Record<string, string>[]
    width?: number | string
    placeholder?: string
    emptyMessage?: string
    removableOptions?: boolean
    inputId?: string
}>()

// Emits
const emit = defineEmits<{
    (e: 'update:modelValue', value: string | null): void
    (e: 'update:options', value: string[]): void
}>()

// Refs & Local variables
const containerRef = ref()
const committedValue = ref<string>(props.modelValue ?? '')
// Helper for picking label
const getLabel = (item: string | Record<string, string>): string => 
    typeof item === 'string' ? item : item.label ?? ''
const defaultOptions = props.defaultOptions ?? []
const isProtected = (option: string) => 
    defaultOptions.some(opt => getLabel(opt).toLowerCase() === option.toLowerCase())
const isRemoving = ref<boolean>(false)

// Computed
const filteredOptions = computed(() => {
    let base = props.options.map(opt => getLabel(opt))

    if (props.filtering) {
        base = base.filter(label => 
                label.toLowerCase().includes(committedValue.value.toLowerCase())
        )
    }

    const order = props.order?.toLowerCase()
    if (order === 'asc') base.sort((a, b) => a.localeCompare(b))
    if (order === 'desc') base.sort((a, b) => b.localeCompare(a))

    return base
})

const containerWidth = computed(() => ({
    minWidth: props.width
        ? typeof props.width === 'number'
            ? `${props.width}px`
            : props.width
        : '100%'
}))

// Methods
function onSelectOption(option: string) {
    committedValue.value = option
    emit('update:modelValue', option)
}

function addOption() {
    if (isRemoving.value) return

    const trimmed = (committedValue.value ?? '').trim()
    if (!trimmed) return

    const exists = props.options.some(opt => getLabel(opt).toLowerCase() === trimmed.toLowerCase())
    //console.log('addOption', exists, trimmed)
    if (!exists) {
        emit('update:options', [...filteredOptions.value, trimmed])
    }
    emit('update:modelValue', trimmed)
}

function removeOption(option: string) {
    if (isProtected(option)) return
    const updated = filteredOptions.value.filter(o => o !== option)
    //console.log('removeOption', isProtected(option), updated)
    emit('update:options', updated)
}

// Watches
watch(() => props.modelValue, val => {
    committedValue.value = val ?? ''
})

// Pass Through
const selectBoxPT = {
    root: {
        class: 'w-full h-9 p-0 border rounded-md border-surface dark:border-gray-700 dark:bg-gray-950 hover:border-primary-200/50 dark:hover:border-gray-700 hover:ring-2 hover:ring-primary-200/50 outline-none dark:hover:ring-primary-800/40',
        style: containerWidth.value,
    },
    label: 'h-full w-full m-0 p-2 pr-4 rounded-md bg-transparent dark:bg-gray-950 text-sm',
    overlay: 'mt-0 border border-surface rounded-md shadow-lg bg-surface-50 dark:bg-gray-900 dark:border-gray-700',
    clearIcon: 'border rounded-full border-surface-400 bg-surface-100 text-surface-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-gray-600 w-4 h-4 p-0.5 right-8 -translate-y-1/2',
    dropdown: 'w-[1.75rem] dark:bg-gray-950 dark:border-gray-700',
    dropdownIcon: 'text-surface-400 hover:text-primary-500',
}
</script>

<template>
    <div ref="containerRef">
        <Select
            v-model="committedValue"
            editable
            :labelId="props.inputId"
            :options="filteredOptions"
            :optionLabel="props.optionLabel ?? ''"
            :placeholder="props.placeholder ?? 'Select or Input'"
            :emptyMessage="props.emptyMessage ?? 'No options found'"
            showClear
            highlightOnSelect
            @keydown.enter.prevent="addOption"
            @blur.prevent="addOption"
            :pt="selectBoxPT"
        >
            <!-- template #value="slotProps">
                <span v-if="slotProps.value" class="text-left">
                    {{ slotProps.value }}
                </span>
                <input v-else type="text" class="text-left text-gray-500" :placeholder="slotProps.placeholder" />
            </template -->
            <template #option="slotProps">
                <div class="w-full h-8 pl-2 flex justify-between items-center">
                    <span class="flex-1 text-sm truncate">{{ slotProps.option }}</span>
                    <Button
                        v-if="props.removableOptions && !isProtected(slotProps.option)"
                        icon="pi pi-trash"
                        variant="text"
                        aria-label="Remove"
                        :disabled="isProtected(slotProps.option)"
                        @mousedown.stop="isRemoving = true"
                        @click.stop="removeOption(slotProps.option)"
                        @mouseup="isRemoving = false"
                        size="small"
                        :pt="{ root: 'h-8 w-8 pointer-events-auto z-20' }"
                    />
                </div>
            </template>
        </Select>
    </div>
</template>