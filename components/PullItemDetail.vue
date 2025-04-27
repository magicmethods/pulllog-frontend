<script setup lang="ts">

// Props
const props = defineProps<{
    maxEntries: number // 最高レア排出数
}>()

// Refs & Local variables
const dropDetails = ref<DropDetail[]>([])
const rarityOptions = ref<string[]>(['SSR', 'SR', '⭐5', '⭐3']) // レアリティ候補
const symbolOptions = ref<SymbolOption[] | string[]>([
    { label: '🏆ピックアップ', value: 'pickup', symbol: '🏆' },
    { label: '💔すり抜け', value: 'offrate', symbol: '💔' },
    { label: '🎯狙い', value: 'target', symbol: '🎯' },
    { label: '⏫+1凸', value: 'stack', symbol: '⏫' },
    { label: '💖完凸', value: 'complete', symbol: '💖' },
]) // シンボル候補

// Methods
function handleRarityChange(index: number, event: Event) {
    if (!event || !event.target) return

    const trimmed = (event.target as HTMLInputElement).value.trim()
    if (trimmed !== '' && !rarityOptions.value.includes(trimmed)) {
        rarityOptions.value.push(trimmed)
    }
    // 明示的に選択値を反映（なくても動作するが念のため）
    dropDetails.value[index].rarity = trimmed
}

// Watches
watch(
    () => props.maxEntries,
    newMax => {
        // maxEntriesの変更を監視（初期表示時も）
        const current = dropDetails.value.length
        if (newMax > current) {
            for (let i = current; i < newMax; i++) {
                dropDetails.value.push({ rarity: '', name: '', symbol: '' })
            }
        } else {
            dropDetails.value.splice(newMax)
        }
    },
    { immediate: true }
)

// Pass Through
const inputTextPT = {
    root: 'w-full border rounded px-2 py-1.5 text-sm border-surface hover:border-surface-400/50 dark:border-gray-700 dark:hover:border-gray-700 dark:bg-gray-950 hover:ring-2 hover:ring-primary-200/50 focus:outline-none dark:hover:ring-primary-800/40 disabled:bg-surface-200/50 disabled:text-surface-600/50',
}

</script>

<template>
    <div class="space-y-2">
        <div v-for="(entry, index) in dropDetails" :key="index"
            class="flex flex-col md:flex-row gap-2 items-start md:items-center border border-dashed p-3 rounded-lg bg-surface-50 dark:bg-gray-800 border-surface-400 dark:border-gray-700"
        >
            <!-- The rarity field provides an editable selection box (like a combo box) -->
            <div class="h-full w-max flex-1">
                <label :for="`field-group-${index + 1}-rarity`" class="block text-sm font-medium mb-1 select-none">レアリティ</label>
                <ComboBox
                    v-model="entry.rarity"
                    :inputId="`field-group-${index + 1}-rarity`"
                    :options="rarityOptions"
                    order="desc"
                    @update:options="(val) => rarityOptions = val"
                    width="8rem"
                    placeholder="選択/入力"
                    emptyMessage="追加できます"
                    :removableOptions="true"
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
                    :pt="inputTextPT"
                />
            </div>

            <!-- The markup symbol field provides an editable selection box (like a combo box) -->
            <div class="w-max flex-auto">
                <label :for="`field-group-${index + 1}-symbol`" class="block text-sm font-medium mb-1 select-none">マーキング</label>
                <ComboBox
                    v-model="entry.symbol"
                    :inputId="`field-group-${index + 1}-symbol`"
                    :options="symbolOptions"
                    @update:options="(val) => symbolOptions = val"
                    width="9rem"
                    placeholder="選択/入力"
                    emptyMessage="追加できます"
                    :removableOptions="true"
                />
            </div>
        </div>
    </div>
</template>
