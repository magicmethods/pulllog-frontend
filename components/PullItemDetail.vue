<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAppStore } from '~/stores/useAppStore'
import { useOptionStore } from '~/stores/useOptionStore'

// Props/Emits
const props = defineProps<{
    maxEntries: number // 最高レア排出数
    modelValue: DropDetail[] // 排出内容の詳細
}>()
const emit = defineEmits<
    (e: 'update:modelValue', value: DropDetail[]) => void
>()

// Stores etc.
const appStore = useAppStore()
const optionStore = useOptionStore()
const { t } = useI18n()

// Refs
const internalDetails = shallowRef<DropDetail[]>([...props.modelValue])

// Computed
const rarityOptions = computed(() => {
    if (appStore.app?.rarity_defs && appStore.app.rarity_defs.length > 0) {
        return appStore.app.rarity_defs.map(opt => opt.label)
    }
    return optionStore.rarityLabels
})
const markerOptions = computed(() => {
    if (appStore.app?.marker_defs && appStore.app.marker_defs.length > 0) {
        return appStore.app.marker_defs.map(opt => opt.label)
    }
    return optionStore.markerLabels
})

// Methods
function updateEntry(index: number, field: keyof DropDetail, value: string | null) {
    const entry = internalDetails.value[index]
    if (!entry) return
    internalDetails.value[index] = { ...entry, [field]: value }
    emit('update:modelValue', [...internalDetails.value])
}

// Watchers
watch(() => props.modelValue, (val) => {
    // (親)modelValue -> (子)internalDetails
    internalDetails.value = [...val]
}, { deep: false, immediate: false })
watch(() => props.maxEntries, (newMax) => {
    // maxEntriesの変更を監視（初期表示時も）
    const entries = internalDetails.value
    const current = entries.length
    if (newMax > current) {
        for (let i = current; i < newMax; i++) {
            entries.push({ rarity: null, name: null, marker: null })
        }
    } else if (newMax < current) {
        entries.splice(newMax)
    }
    emit('update:modelValue', [...entries])
}, { immediate: true })
</script>

<template>
    <div class="space-y-2">
        <div
            v-for="(entry, index) in internalDetails"
            :key="index"
            class="borderedContainer flex flex-col md:flex-row gap-2 items-start md:items-center border-dashed p-3 rounded-lg"
        >
            <!-- The rarity field provides an editable selection box (like a combo box) -->
            <div class="h-full w-max flex-1">
                <label :for="`field-group-${index + 1}-rarity`" class="block text-sm font-medium mb-1 select-none">
                    {{ t('component.pullItemDetail.rarity') }}
                </label>
                <ComboBox
                    :modelValue="entry.rarity"
                    :inputId="`field-group-${index + 1}-rarity`"
                    :options="rarityOptions"
                    order="desc"
                    @update:modelValue="(val: string | null) => updateEntry(index, 'rarity', val ?? null)"
                    @update:options="(opts) => rarityOptions = opts"
                    width="8rem"
                    :placeholder="t('component.pullItemDetail.rarityPlaceholder')"
                    :emptyMessage="t('component.pullItemDetail.rarityEmptyMessage')"
                    :removableOptions="!(appStore.app?.rarity_defs && appStore.app.rarity_defs.length > 0)"
                    class="m-0 p-0"
                    :pt="{ label: 'pr-4' }"
                />
            </div>

            <!-- Character/item name fields allow for text entry -->
            <div class="w-full flex-grow">
                <label :for="`field-group-${index + 1}-name`" class="block text-sm font-medium mb-1 select-none">
                    {{ t('component.pullItemDetail.dropItemName') }}
                </label>
                <InputText
                    :modelValue="entry.name"
                    :id="`field-group-${index + 1}-name`"
                    @update:modelValue="(val: string | undefined) => updateEntry(index, 'name', val ?? null)"
                    :placeholder="t('component.pullItemDetail.dropItemNamePlaceholder')"
                    fluid
                />
            </div>

            <!-- The markup symbol field provides an editable selection box (like a combo box) -->
            <div class="w-max flex-auto">
                <label :for="`field-group-${index + 1}-marker`" class="block text-sm font-medium mb-1 select-none">
                    {{ t('component.pullItemDetail.marker') }}
                </label>
                <ComboBox
                    :modelValue="entry.marker"
                    :inputId="`field-group-${index + 1}-marker`"
                    :options="markerOptions"
                    @update:modelValue="(val) => updateEntry(index, 'marker', val ?? null)"
                    @update:options="(opts) => markerOptions = opts"
                    width="9rem"
                    :placeholder="t('component.pullItemDetail.markerPlaceholder')"
                    :emptyMessage="t('component.pullItemDetail.markerEmptyMessage')"
                    :removableOptions="!(appStore.app?.marker_defs && appStore.app.marker_defs.length > 0)"
                    :pt="{ label: 'pr-4' }"
                />
            </div>
        </div>
    </div>
</template>
