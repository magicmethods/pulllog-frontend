<script setup lang="ts">
import { useI18n } from "vue-i18n"

// Props/Emits
const props = defineProps<{
    visible: boolean
    app?: AppData
    loading?: boolean
}>()
const emit = defineEmits<{
    (e: "update:visible", value: boolean): void
    (e: "confirm", value: AppData): void
}>()

// i18n
const { t } = useI18n()

// Methods
// Confirm ハンドラ
function handleConfirm() {
    if (!props.app) return
    emit("confirm", props.app)
}
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(v: boolean) => emit('update:visible', v)"
        modal
        :header="t('modal.deleteConfirm.header')"
        :dismissableMask="true"
    >
        <div class="flex flex-col gap-1">
            <p>
                <span>{{ t('modal.deleteConfirm.confirmTextPrefix') }}</span>
                <span class="mx-2 font-bold text-danger">{{ app?.name || t('modal.deleteConfirm.noAppName') }}</span>
                <span>{{ t('modal.deleteConfirm.confirmTextSuffix') }}</span>
            </p>
            <p>{{ t('modal.deleteConfirm.confirmNotice') }}</p>
            <p class="text-danger text-sm">{{ t('modal.deleteConfirm.dangerNotice') }}</p>
        </div>
        <template #footer>
            <Button
                :label="t('modal.deleteConfirm.cancel')"
                @click="emit('update:visible', false)"
                class="btn btn-alt"
            />
            <Button
                :label="t('modal.deleteConfirm.delete')"
                @click="handleConfirm"
                class="btn btn-secondary"
                :disabled="!app || loading"
                :loading="loading"
            />
        </template>
    </Dialog>
</template>
