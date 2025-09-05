<script setup lang="ts">
import { useI18n } from "vue-i18n"

// Props & Emits
const props = defineProps<{
    modelValue: number
}>()
const emit = defineEmits<{
    (e: "commit-add", value: number): void
    (e: "commit-overwrite", value: number): void
    (e: "close"): void
}>()

// i18n
const { t } = useI18n()

// Ref & Local variables
const visible = ref<boolean>(true)
const inputExpression = ref<string>("")
const result = ref<number | null>(null)

// 小数点付きフォーマット（将来的に通貨対応も可能）
const formattedResult = computed(() => {
    if (result.value === null) return ""
    return result.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
})

// Methods
const appendInput = (char: string) => {
    inputExpression.value += char
}

const cloneAmount = () => {
    inputExpression.value = props.modelValue.toString()
}

const clearInput = () => {
    inputExpression.value = ""
    result.value = null
}

const backspace = () => {
    inputExpression.value = inputExpression.value.slice(0, -1)
}

const calculateResult = () => {
    try {
        // 安全に数式評価する
        const sanitized = inputExpression.value.replace(/[^0-9+\-*/.]/g, "")
        const evalFunc = new Function(`return (${sanitized})`)
        const evaluated = evalFunc()
        result.value = Number(evaluated)
    } catch (error) {
        result.value = null
    }
}

const commitAdd = () => {
    if (result.value !== null) {
        emit("commit-add", result.value)
        visible.value = false
    }
}

const commitOverwrite = () => {
    if (result.value !== null) {
        emit("commit-overwrite", result.value)
        visible.value = false
    }
}

const close = () => {
    emit("close")
    visible.value = false
}

// モーダル閉じたらemit（親コンポーネントでv-ifで制御する想定）
watch(visible, (v) => {
    if (!v) emit("close")
})

// Class
const modalCloseButton =
    "h-8 w-8 m-0 p-0 rounded-full hover:bg-surface-200/50 hover:text-primary-500 dark:hover:bg-gray-700/40"
</script>

<template>
    <Dialog v-model:visible="visible" modal :closable="false" class="w-80 dark:bg-gray-800">
        <div class="flex flex-col items-center p-2">
            <!-- 計算式表示 -->
            <div class="w-full text-right text-lg tracking-wider border border-surface-300 dark:border-gray-700 bg-surface-50/50 dark:bg-gray-950/50 p-2 mb-2 rounded">
                {{ inputExpression || '0' }}
            </div>

            <!-- 計算結果表示 -->
            <div class="w-full text-right text-xl font-bold p-2 mb-2">
                <i class="pi pi-equals text-surface-600 dark:text-gray-400" />
                <span :class="result !== null ? 'ml-2' : ''">{{ result !== null ? formattedResult : '' }}</span>
            </div>

            <!-- テンキー部 -->
            <CalculatorKeypad @input="appendInput" />

            <!-- クリア・クローン・バックスペース・イコール -->
            <div class="w-full grid grid-cols-4 gap-2 my-2">
                <Button label="0" icon="pi pi-eraser" @click="clearInput" class="btn btn-keypad w-full" />
                <Button label=""  icon="pi pi-clone"  @click="cloneAmount" class="btn btn-keypad w-full" />
                <Button label=""  icon="pi pi-delete-left" @click="backspace" class="btn btn-keypad w-full" />
                <Button label=""  icon="pi pi-equals" @click="calculateResult" class="btn btn-keypad w-full" />
            </div>

            <hr class="divider" />

            <!-- コミットボタン群 -->
            <div class="w-full grid grid-cols-2 gap-2 px-0 py-2">
                <Button
                    :label="t('modal.calculator.commitAdd')"
                    @click="commitAdd"
                    severity="success"
                    class="w-full btn btn-primary mb-0 text-base"
                    :disabled="result === null"
                />
                <Button
                    :label="t('modal.calculator.commitOverwrite')"
                    @click="commitOverwrite"
                    severity="info"
                    class="w-full btn btn-primary mb-0 text-base"
                    :disabled="result === null"
                />
            </div>

            <!-- キャンセル -->
            <Button
                :label="t('modal.calculator.cancel')"
                @click="close"
                class="w-full btn btn-alternative mb-0 text-base"
            />
        </div>
        <template #header>
            <div class="w-full flex items-center justify-between p-2 pb-0">
                <h3 class="text-primary-800 dark:text-primary-400 text-lg font-medium">{{ t('modal.calculator.title') }}</h3>
                <Button
                    icon="pi pi-times"
                    :class="modalCloseButton"
                    @click="close"
                    :aria-label="t('modal.calculator.dismiss')"
                />
            </div>
        </template>
    </Dialog>
</template>
