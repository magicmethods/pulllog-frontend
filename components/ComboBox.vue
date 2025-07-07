<script setup lang="ts">
import type { SelectPassThroughOptions } from 'primevue'

// Props
const props = defineProps<{
    modelValue: string | null
    options: string[] | Record<string, string>[]
    optionLabel?: string
    filtering?: boolean
    order?: 'asc' | 'desc'
    defaultOptions?: string[] | Record<string, string>[]
    width?: number | string
    placeholder?: string
    emptyMessage?: string
    removableOptions?: boolean
    inputId?: string
    pt?: PassThroughValue
}>()

// Emits
const emit = defineEmits<{
    (e: 'update:modelValue', value: string | null): void
    (e: 'update:options', value: string[]): void
}>()

// State & Helpers
const getLabel = (item: string | Record<string, string>): string => 
    typeof item === 'string' ? item : item.label ?? ''
const isRemoving = ref<boolean>(false)
const defaultOptions = props.defaultOptions ?? []
const isProtected = (option: string) => 
    defaultOptions.some(opt => getLabel(opt).toLowerCase() === option.toLowerCase())

// Computed
const passThroughOptions = computed<SelectPassThroughOptions>(() => props.pt ? { ...props.pt } : {}) 
const filteredOptions = computed(() => {
    let base = props.options.map(opt => getLabel(opt))

    if (props.filtering && props.modelValue) {
        base = base.filter(label =>
            label.toLowerCase().includes((props.modelValue ?? '').toLowerCase())
        )
    }

    const order = props.order?.toLowerCase()
    if (props.order === 'asc') base.sort((a, b) => a.localeCompare(b))
    if (props.order === 'desc') base.sort((a, b) => b.localeCompare(a))
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
function addOption() {
    if (isRemoving.value) return

    const trimmed = (props.modelValue ?? '').trim()
    if (!trimmed) return

    const exists = props.options.some(opt =>
        getLabel(opt).toLowerCase() === trimmed.toLowerCase()
    )
    if (!exists) emit('update:options', [...filteredOptions.value, trimmed])
    emit('update:modelValue', trimmed)
}
function removeOption(option: string) {
    if (isProtected(option)) return
    const updated = filteredOptions.value.filter(o => o !== option)
    emit('update:options', updated)
}

</script>

<template>
    <div>
        <Select
            :modelValue="modelValue"
            :labelId="props.inputId"
            editable
            :options="filteredOptions"
            :optionLabel="optionLabel ?? ''"
            :placeholder="placeholder ?? 'Select or Input'"
            :emptyMessage="emptyMessage ?? 'No options found'"
            showClear
            highlightOnSelect
            @update:modelValue="(val: string | null) => emit('update:modelValue', val)"
            @keydown.enter.prevent="addOption"
            @blur.prevent="addOption"
            :style="containerWidth"
            :pt="passThroughOptions"
        >
            <template #option="slotProps">
                <div class="w-full h-8 pl-2 flex justify-between items-center">
                    <span class="flex-1 text-sm truncate">{{ slotProps.option }}</span>
                    <Button
                        v-if="removableOptions && !isProtected(slotProps.option)"
                        icon="pi pi-trash"
                        variant="text"
                        aria-label="Remove"
                        :disabled="isProtected(slotProps.option)"
                        @mousedown.stop="isRemoving = true"
                        @click.stop="removeOption(slotProps.option)"
                        @mouseup="isRemoving = false"
                        size="small"
                        :pt:root="'h-8 w-8 pointer-events-auto z-20'"
                    />
                </div>
            </template>
        </Select>
    </div>
</template>