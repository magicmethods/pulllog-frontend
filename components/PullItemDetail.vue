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

// Refs & Local State
const internalDetails = ref<DropDetail[]>([...props.modelValue])

// Methods

// Watches
watch(
    () => props.modelValue,
    val => {
        // modelValue -> internal
        internalDetails.value = [...val]
    }
)
watch(
    () => props.maxEntries,
    newMax => {
        // maxEntriesの変更を監視（初期表示時も）
        const current = internalDetails.value.length
        if (newMax > current) {
            for (let i = current; i < newMax; i++) {
                internalDetails.value.push({ rarity: null, name: null, symbol: null })
            }
        } else {
            internalDetails.value.splice(newMax)
        }
        emit('update:modelValue', internalDetails.value)
    },
    { immediate: true }
)
watch(internalDetails, (val) => {
    // internalDetails -> 親に反映
    emit('update:modelValue', val)
}, { deep: true })
</script>

<template>
    <div class="space-y-2">
        <div v-for="(entry, index) in internalDetails" :key="index"
            class="borderedContainer flex flex-col md:flex-row gap-2 items-start md:items-center border-dashed p-3 rounded-lg"
        >
            <!-- The rarity field provides an editable selection box (like a combo box) -->
            <div class="h-full w-max flex-1">
                <label :for="`field-group-${index + 1}-rarity`" class="block text-sm font-medium mb-1 select-none">レアリティ</label>
                <ComboBox
                    v-model="entry.rarity"
                    :inputId="`field-group-${index + 1}-rarity`"
                    :options="optionStore.rarityLabels"
                    order="desc"
                    __update:options="(val) => optionStore.rarityLabels = val"
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
                <label :for="`field-group-${index + 1}-name`" class="block text-sm font-medium mb-1 select-none">キャラ／アイテム名</label>
                <InputText
                    v-model="entry.name"
                    :id="`field-group-${index + 1}-name`"
                    placeholder="例: アルトリア・キャスター"
                    fluid
                />
            </div>

            <!-- The markup symbol field provides an editable selection box (like a combo box) -->
            <div class="w-max flex-auto">
                <label :for="`field-group-${index + 1}-symbol`" class="block text-sm font-medium mb-1 select-none">マーキング</label>
                <ComboBox
                    v-model="entry.symbol"
                    :inputId="`field-group-${index + 1}-symbol`"
                    :options="optionStore.markerLabels"
                    __update:options="(val) => optionStore.symbolOptions = val"
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
