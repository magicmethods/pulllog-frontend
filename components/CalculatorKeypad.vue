<script setup lang="ts">
//import { defineEmits } from 'vue'

// Emits
const emit = defineEmits<
    (e: 'input', value: string) => void
>()

/*
// テンキー配置（3x4）
const keys = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '+'
]
*/
// テンキー配置（4x4）
const keys = [
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { icon: 'pi pi-percentage', value: '/', iconClass: 'rotate-45 text-sm' },

    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { icon: 'pi pi-times', value: '*' },

    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { icon: 'pi pi-minus', value: '-' },

    { label: '0', value: '0' },
    { label: '00', value: '00' },
    { label: '.', value: '.' },
    { icon: 'pi pi-plus', value: '+' }
]


// Methods
const handleInput = (key: string) => {
    emit('input', key)
}

// Pass Through
const keypadPT = (iconClass: string | null) => {
    return {
        root: 'w-full p-2 border rounded-md bg-surface-200 hover:bg-surface-300 border-surface-400 dark:bg-surface-700 dark:hover:bg-surface-600 dark:border-surface-500 text-lg font-semibold',
        icon: iconClass ?? '',
    }
}
</script>

<template>
    <div class="w-full grid grid-cols-4 gap-2">
        <Button
            v-for="key in keys"
            :key="key.value"
            :label="key.icon ? '' : key.label"
            :icon="key.icon"
            @click="handleInput(key.value)"
            :pt="keypadPT(key.iconClass ?? null)"
        />
    </div>
</template>
