<script setup lang="ts">
import { useOptionStore } from '~/stores/useOptionStore'

// Props/Emits
const props = defineProps<{
    maxEntries: number // 最高レア排出数
    modelValue: DropDetail[] // 排出内容の詳細
}>()
const emit = defineEmits<
    (e: 'update:modelValue', value: DropDetail[]) => void
>()

// Stores
const optionStore = useOptionStore()

// Refs
const internalDetails = shallowRef<DropDetail[]>([...props.modelValue])

// Computed
const rarityOptions = computed(() => optionStore.rarityLabels)
const markerOptions = computed(() => optionStore.markerLabels)

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
                    レアリティ
                </label>
                <ComboBox
                    :modelValue="entry.rarity"
                    :inputId="`field-group-${index + 1}-rarity`"
                    :options="rarityOptions"
                    order="desc"
                    @update:modelValue="(val) => updateEntry(index, 'rarity', val ?? null)"
                    @update:options="(opts) => rarityOptions = opts"
                    width="8rem"
                    placeholder="選択/入力"
                    emptyMessage="追加できます"
                    :removableOptions="true"
                    class="m-0 p-0"
                    :pt="{ label: 'pr-4' }"
                />
            </div>

            <!-- Character/item name fields allow for text entry -->
            <div class="w-full flex-grow">
                <label :for="`field-group-${index + 1}-name`" class="block text-sm font-medium mb-1 select-none">
                    キャラ／アイテム名
                </label>
                <InputText
                    :modelValue="entry.name"
                    :id="`field-group-${index + 1}-name`"
                    @update:modelValue="(val) => updateEntry(index, 'name', val ?? null)"
                    placeholder="例: アルトリア・キャスター"
                    fluid
                />
            </div>

            <!-- The markup symbol field provides an editable selection box (like a combo box) -->
            <div class="w-max flex-auto">
                <label :for="`field-group-${index + 1}-marker`" class="block text-sm font-medium mb-1 select-none">
                    マーキング
                </label>
                <ComboBox
                    :modelValue="entry.marker"
                    :inputId="`field-group-${index + 1}-marker`"
                    :options="markerOptions"
                    @update:modelValue="(val) => updateEntry(index, 'marker', val ?? null)"
                    @update:options="(opts) => markerOptions = opts"
                    width="9rem"
                    placeholder="選択/入力"
                    emptyMessage="追加できます"
                    :removableOptions="true"
                    :pt="{ label: 'pr-4' }"
                />
            </div>
        </div>
    </div>
</template>
