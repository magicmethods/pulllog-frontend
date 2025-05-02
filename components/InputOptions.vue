<script setup lang="ts">

// Props
const props = defineProps<{
    modelValue: SymbolOption[]
    inputId?: string
    placeholder?: string
    defaultOptions?: SymbolOption[]
    maxItems?: number
    maxLength?: number
    withPreview?: boolean
    class?: string
}>()

// Refs & Local variables
const currentOptions = ref<SymbolOption[]>(props.modelValue ?? [])



</script>

<template>
    <div class="w-full grid grid-cols-2 gap-2">
        <div class="w-full flex-grow flex flex-col gap-2">
            <InputGroup v-for="(opt, i) in props.defaultOptions" :key="i">
                <InputGroupAddon>
                    <Button icon="pi pi-face-smile" _label="⚜️" severity="secondary" />
                </InputGroupAddon>
                <InputText :value="opt" :placeholder="opt" :pt:root="'rounded-none'" />
                <InputGroupAddon>
                    <Button icon="pi pi-plus" severity="secondary" />
                </InputGroupAddon>
            </InputGroup>
        </div>
        <div class="w-full flex-grow">
            <OrderList v-model="props.defaultOptions" dataKey="value" breakpoint="575px" pt:pcListbox:root="w-full sm:w-56">
                <template #option="{ option }">
                    {{ option.label }}
                </template>
            </OrderList>
        </div>
    </div>
</template>