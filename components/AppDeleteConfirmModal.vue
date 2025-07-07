<script setup lang="ts">

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: AppData
    loading?: boolean
}>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'confirm', value: AppData): void
}>()

// Methods
// Confirm ハンドラ
function handleConfirm() {
    if (!props.app) return
    emit('confirm', props.app)
}

</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(v: boolean) => emit('update:visible', v)"
        modal
        header="アプリケーションの削除"
        :dismissableMask="true"
    >
        <div class="flex flex-col gap-1">
            <p>
                <span>アプリケーション</span>
                <span class="mx-2 font-bold text-danger">{{ app?.name || '(未選択)' }}</span>
                <span>を削除します。</span>
            </p>
            <p>この操作は元に戻せません。よろしいですか？</p>
            <p class="text-danger text-sm">注意: このアプリケーションに関連するすべてのデータが削除されます。</p>
        </div>
        <template #footer>
            <Button
                label="キャンセル"
                @click="emit('update:visible', false)"
                class="btn btn-alt"
            />
            <Button
                label="削除する"
                @click="handleConfirm"
                class="btn btn-secondary"
                :disabled="!app || loading"
                :loading="loading"
            />
        </template>
    </Dialog>
</template>
