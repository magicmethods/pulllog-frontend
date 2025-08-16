<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useUserStore } from '~/stores/useUserStore'

const props = defineProps<{
    visible: boolean
}>()
const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'deleted'): void
}>()

const { t } = useI18n()
const loading = ref(false)
const error = ref<string | null>(null)
const userStore = useUserStore()

async function handleDelete() {
    loading.value = true
    error.value = null
    try {
        await userStore.deleteUser()
        emit('deleted')
        emit('update:visible', false)
    } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : t('settings.withdrawalModal.userDeleteFailed')
    } finally {
        loading.value = false
    }
}
function handleCancel() {
    emit('update:visible', false)
}
</script>

<template>
    <Dialog
        :visible="props.visible"
        :modal="true"
        :closable="!loading"
        :dismissableMask="!loading"
        :header="t('settings.withdrawalModal.accountDeleteConfirmTitle')"
        class="w-full max-w-md"
        @update:visible="(val: boolean) => emit('update:visible', val)"
    >
        <div class="flex flex-col items-center gap-4">
            <div class="text-center text-red-700 font-semibold text-lg" v-html="t('settings.withdrawalModal.accountDeleteWarning')">
            </div>
            <div class="text-sm text-gray-500 text-center mb-2">
                {{ t('settings.withdrawalModal.accountDeleteIrreversible') }}
            </div>
            <Message v-if="error" severity="error" size="small" variant="simple" class="mt-1">
                {{ error }}
            </Message>
        </div>

        <template #footer>
            <div class="w-full flex items-center justify-between gap-4">
                <Button
                    :label="t('settings.cancel')"
                    class="btn btn-alt"
                    :disabled="loading"
                    @click="handleCancel"
                />
                <Button
                    :label="loading ? t('settings.withdrawalModal.deleting') : t('settings.withdrawalModal.confirmDelete')"
                    class="btn btn-secondary"
                    :loading="loading"
                    :disabled="loading"
                    @click="handleDelete"
                />
            </div>
        </template>
    </Dialog>
</template>
