<script setup lang="ts">
import type { ChipsAddEvent } from "primevue/chips"
import { useI18n } from "vue-i18n"

// Props & Emits
const props = defineProps<{
    modelValue: string[]
    inputId?: string
    placeholder?: string
    class?: string
    maxTags?: number // 最大タグ数
    maxLength?: number // 最大文字数
    disabled?: boolean
    tagPrefix?: string // 'icon' or 'symbol'
}>()
const emit = defineEmits<(e: "update:modelValue", value: string[]) => void>()

// i18n
const { t } = useI18n()

// Refs & Local variables
const internalValue = ref<string[]>([...props.modelValue])

// Computed
const placeholderText = computed(() => {
    if (props.placeholder) {
        const maxTags = (props.maxTags ?? "").toString()
        const maxLength = (props.maxLength ?? "").toString()
        return props.placeholder
            .replace(/%maxTags%/g, maxTags)
            .replace(/%maxLength%/g, maxLength)
    }
    return props.maxTags !== undefined
        ? t("component.inputTags.maxTags", { count: props.maxTags })
        : t("component.inputTags.addTag")
})

// Methods
const updateValue = (value: string[]) => {
    const unique = Array.from(
        new Set(
            value.map((v) => {
                const tag = (v?.toString() ?? "").trim()
                return props.maxLength !== undefined
                    ? tag.slice(0, props.maxLength).trim()
                    : tag
            }),
        ),
    ).filter((v) => v.length > 0)

    if (props.maxTags !== undefined && unique.length > props.maxTags) return

    internalValue.value = unique
    emit("update:modelValue", unique)
}
const clearIMEInput = async (evt: KeyboardEvent) => {
    // IME確定後のゴミ入力削除
    if (internalValue.value.length === 0) return
    const target = evt.target as HTMLInputElement
    if (evt.key === "Process" && evt.code === "Enter" && evt.isComposing) {
        await setTimeout(() => {
            target.value = ""
        })
    }
    return Promise.resolve()
}
const handleAdd = async (e: ChipsAddEvent) => {
    const evt = e.originalEvent as KeyboardEvent
    const target = evt.target as HTMLInputElement

    let rawInputs: string[] = []

    if (Array.isArray(e.value)) {
        rawInputs = e.value.map((v) => v?.toString() ?? "")
    } else if (typeof e.value === "string") {
        rawInputs = [(e.value ?? "").toString()]
    }
    // 入力値を正規化
    const sanitizedInputs = rawInputs
        .map((v) =>
            props.maxLength !== undefined ? v.slice(0, props.maxLength) : v,
        )
        .map((v) => v.trim())
        .filter(
            (v) =>
                v.length > 0 &&
                props.maxLength !== undefined &&
                v.length <= props.maxLength,
        )

    await clearIMEInput(evt)

    if (sanitizedInputs.length === 0) return

    const input = sanitizedInputs.slice(-1)[0]

    // 最大タグ数を超えた場合は追加しない
    if (
        props.maxTags !== undefined &&
        internalValue.value.length >= props.maxTags
    ) {
        //console.warn(`タグ数の上限(${props.maxTags}件)に達しました`)
        await clearIMEInput(evt)
        return
    }

    // 重複チェック（すでに存在する場合は追加しない）
    if (internalValue.value.includes(input)) return

    updateValue([...internalValue.value, input])

    await clearIMEInput(evt)
}

// Watches
watch(
    () => props.modelValue,
    (tags) => {
        // モデルの同期
        internalValue.value = [...tags]
    },
)
</script>

<template>
    <Chips
        :modelValue="modelValue"
        @update:modelValue="updateValue"
        :id="inputId"
        :placeholder="placeholderText"
        :class="props.class"
        separator=","
        @add="handleAdd"
        :disabled="props.disabled"
        :pt="{
            root: props.disabled ? 'bg-surface-200/50 text-surface-600/50 dark:bg-gray-800/40! opacity-100' : '',
            inputitemfield: props.disabled ? 'dark:bg-transparent dark:text-gray-600' : '',
        }"
    >
        <template #chip="slotProps">
            <div
                class="flex items-center gap-1 px-1 py-0.5 rounded-full"
                :class="[ props.disabled
                    ? 'bg-surface-300 text-surface-600 dark:bg-gray-600/50 dark:text-gray-400'
                    : 'bg-primary-500 text-white dark:bg-primary-700'
                ]"
            >
                <i v-if="props.tagPrefix === 'icon'" class="pi pi-tag ml-1" />
                <span v-else>🏷️</span>
                <span class="text-sm">{{ slotProps.value }}</span>
                <Button
                    icon="pi pi-times"
                    :class="[ props.disabled
                        ? 'text-surface-400 dark:text-gray-500 hover:text-surface-400 dark:hover:text-gray-500'
                        : 'text-white hover:text-primary-200'
                    ]"
                    aria-label="remove"
                    :disabled="props.disabled"
                    @click.stop.prevent="updateValue(internalValue.filter((v) => v !== slotProps.value))"
                    size="small"
                />
            </div>
        </template>
    </Chips>
</template>
