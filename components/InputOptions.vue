<script setup lang="ts">
import { ulid } from "ulid"
import { useI18n } from "vue-i18n"

// Props
const props = defineProps<{
    modelValue: SymbolOption[]
    inputId: string
    placeholder?: string
    maxItems?: number
    maxLength?: number
    withPreview?: boolean
    helpText?: string | boolean
    class?: string
    activeEmojiPickerId: string | null
}>()

// i18n
const { t } = useI18n()

// Emits
const emit = defineEmits<{
    (e: "update:modelValue", value: SymbolOption[]): void
    (e: "update:activeEmojiPickerId", id: string | null): void
}>()

// State & Refs
const internalSymbol = ref<string>("")
const internalLabel = ref<string>("")
const symbolButtonRef = ref<HTMLElement | null>(null)

// Computed
const currentOptions = computed<SymbolOption[]>({
    get: () => props.modelValue,
    set: (val) => emit("update:modelValue", val),
})
const showEmojiPicker = computed({
    get: () => props.activeEmojiPickerId === props.inputId,
    set: (val: boolean) =>
        emit("update:activeEmojiPickerId", val ? props.inputId : null),
})
const helpText = computed(() => {
    let txt = t("component.inputOptions.helpText")
    if (props.maxItems)
        txt += ` ${t("component.inputOptions.maxItems", { count: props.maxItems })}`
    if (props.maxLength)
        txt += ` ${t("component.inputOptions.maxLength", { count: props.maxLength })}`
    return typeof props.helpText === "string" ? props.helpText : txt
})
const isInsertable = computed(() => {
    const trimmed = internalLabel.value.trim()
    if (!trimmed || trimmed.length === 0) return false
    if (props.maxItems && currentOptions.value.length >= props.maxItems)
        return false
    if (props.maxLength && trimmed.length > props.maxLength) return false
    return !currentOptions.value.some((o) => o && o.value === trimmed)
})

// Methods
function insertEmoji(emoji: string) {
    internalSymbol.value = emoji
    if (!internalLabel.value.startsWith(emoji)) {
        internalLabel.value = `${emoji}${internalLabel.value}`.trim()
    }
    showEmojiPicker.value = false
}
function addNewOption() {
    const trimmed = internalLabel.value.trim()
    if (!isInsertable.value) return

    const newItem: SymbolOption = {
        symbol: internalSymbol.value,
        label: trimmed,
        value: ulid(),
    }

    const existingIndex = currentOptions.value.findIndex(
        (o) => o.label === trimmed,
    )
    const newOptions = [...currentOptions.value]
    if (existingIndex === -1) {
        // Add new item
        newOptions.push(newItem)
    } else {
        // Update an existing item
        newOptions[existingIndex] = newItem
    }
    currentOptions.value = newOptions
    internalSymbol.value = ""
    internalLabel.value = ""
}
function toggleEmojiPicker() {
    showEmojiPicker.value = !showEmojiPicker.value
}
</script>

<template>
    <div class="w-full flex flex-wrap md:flex-nowrap gap-4">
        <div class="w-full md:w-3/5 flex-grow flex flex-col gap-2">
            <InputGroup>
                <InputGroupAddon
                    class="bg-transparent hover:bg-surface-50 dark:hover:bg-gray-600 border-r-0 border-surface-300 dark:border-gray-400 dark:text-gray-300 dark:hover:text-gray-200 cursor-pointer"
                >
                    <div
                        ref="symbolButtonRef"
                        class="h-full w-full flex items-center justify-center"
                    >
                        <Button
                            :id="`emoji-trigger-${props.inputId}`"
                            icon="pi pi-face-smile"
                            severity="secondary"
                            class="h-full w-full"
                            aria-label="Insert Symbol"
                            @click.stop="toggleEmojiPicker"
                        />
                    </div>
                </InputGroupAddon>
                <InputText
                    type="text"
                    v-model="internalLabel"
                    :placeholder="props.placeholder"
                    aria-autocomplete="none"
                    :maxlength="props.maxLength"
                    :pt:root="'rounded-none z-10'"
                />
                <InputGroupAddon
                    class="border-l-0 border-surface-300 dark:border-gray-400"
                    :class="[
                        isInsertable ?
                            'bg-transparent hover:bg-surface-50 dark:hover:bg-gray-600 dark:text-gray-300 dark:hover:text-gray-200 cursor-pointer' :
                            'bg-surface-100 text-surface-400 dark:text-gray-500 cursor-not-allowed pointer-events-none'
                    ]"
                >
                    <Button
                        icon="pi pi-plus"
                        severity="secondary"
                        :disabled="!isInsertable"
                        class="h-full w-full"
                        aria-label="Add Option"
                        @click.stop="addNewOption"
                    />
                </InputGroupAddon>
            </InputGroup>
            <Message size="small" severity="secondary" variant="simple" pt:text="text-xs">
                {{ helpText }}
            </Message>
        </div>
        <div class="w-full md:w-2/5 flex-grow">
            <CustomOrderList
                :modelValue="currentOptions"
                @update:modelValue="(val) => currentOptions = (val as SymbolOption[])"
                uniqueKey="value"
                labelKey="label"
                scrollHeight="160px"
                :emptyMessage="t('component.inputOptions.emptyMessage')"
                :removeItem="true"
                :multiSelect="true"
            />
        </div>

        <EmojiPicker
            v-if="showEmojiPicker"
            :target="symbolButtonRef"
            modalId="appEditModal"
            :id="`emoji-picker-${props.inputId}`"
            @select="insertEmoji"
            @close="showEmojiPicker = false"
        />
    </div>
</template>