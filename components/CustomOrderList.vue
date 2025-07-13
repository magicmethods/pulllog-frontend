<script setup lang="ts">
import Sortable from 'sortablejs'
import { useI18n } from 'vue-i18n'

// Types
// biome-ignore lint:/suspicious/noExplicitAny: Property values ​​for object arrays remain flexible
type GenericItem = Record<string, any>

// Props & Emits
const props = defineProps<{
    /** 表示対象のアイテム一覧 */
    modelValue: GenericItem[]
    /** 一意性を判定するキーの名前（例: 'value' や 'id'） */
    uniqueKey: string
    /** 表示用ラベルキー（例: 'label' や 'name'） */
    labelKey?: string
    /** Overflow時のスクロールが発生する高さ */
    scrollHeight?: string | number
    /** リストコンテナの最小高さ */
    minHeight?: string | number
    /** 表示アイテムが空の時のラベル */
    emptyMessage?: string
    /** アイテムの削除を許可するかどうか */
    removeItem?: boolean
    /** アイテムの複数選択・並び替えの可否 */
    multiSelect?: boolean
}>()
const emit = defineEmits<{
    (e: 'update:modelValue', value: GenericItem[]): void
    (e: 'select', value: GenericItem | GenericItem[] | null): void
}>()

// i18n
const { t } = useI18n()

// State
const listRef = ref<HTMLElement | null>(null)
const selectedKeys = ref<Set<string>>(new Set())
let sortable: Sortable | null = null

// Computed
const items = computed<GenericItem[]>({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})
const labelName = computed(() => props.labelKey ?? props.uniqueKey)
const scrollHeight = computed(() => 
    typeof props.scrollHeight === 'number' ? `${props.scrollHeight}px` : props.scrollHeight ?? 'max-content'
)
const minHeight = computed(() => {
    if (props.minHeight) return typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight
    if (props.scrollHeight) return typeof props.scrollHeight === 'number' ? `${props.scrollHeight}px` : props.scrollHeight
    return 'auto'
})

// Methods
function toggleSelect(item: GenericItem, event?: MouseEvent) {
    const key = item[props.uniqueKey]
    const multiKey = event?.metaKey || event?.ctrlKey

    if (props.multiSelect && multiKey) {
        selectedKeys.value.has(key)
            ? selectedKeys.value.delete(key)
            : selectedKeys.value.add(key)
    } else {
        if (selectedKeys.value.has(key) && selectedKeys.value.size === 1) {
            selectedKeys.value.clear()
            emit('select', null)
            return
        }
        selectedKeys.value.clear()
        selectedKeys.value.add(key)
    }

    const selectedItems = [...selectedKeys.value]
        .map(k => props.modelValue.find(i => i[props.uniqueKey] === k))
        .filter(Boolean) as GenericItem[]
    emit('select', props.multiSelect ? selectedItems : selectedItems[0] ?? null)
}

function removeItem(item: GenericItem) {
    const key = item[props.uniqueKey]
    const filtered = props.modelValue.filter(i => i[props.uniqueKey] !== key)
    selectedKeys.value.delete(key)
    emit('update:modelValue', filtered)
}

function setupSortable() {
    sortable?.destroy()
    if (!listRef.value) return

    sortable = Sortable.create(listRef.value, {
        animation: 150,
        handle: '.draggable-item',
        ghostClass: 'drag-ghost',
        chosenClass: 'drag-chosen',
        onEnd: ({ oldIndex, newIndex }) => {
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

            const moved = [...props.modelValue]
            const movedItem = moved.splice(oldIndex, 1)[0]
            moved.splice(newIndex, 0, movedItem)
            emit('update:modelValue', moved)
        }
    })
}

// Lifecycle Hooks
onMounted(setupSortable)
onBeforeUnmount(() => sortable?.destroy())

</script>

<template>
    <ul
        ref="listRef"
        class="rounded-md border border-surface-300 dark:border-gray-700 dark:bg-gray-950 w-full overflow-y-auto p-1"
        :style="{ maxHeight: scrollHeight, minHeight }"
    >
        <li
            v-for="(item, idx) in modelValue"
            :key="item[uniqueKey]"
            class="flex items-center justify-start pl-2 pr-1 py-1 mb-0.5 rounded text-sm"
            :class="[
                selectedKeys.has(item[uniqueKey])
                ? 'text-white dark:text-gray-50 bg-primary-500 hover:bg-primary-400 dark:bg-primary-800 dark:hover:bg-primary-700 select-none draggable-item cursor-move'
                : 'text-surface-600 dark:text-gray-400 bg-transparent hover:bg-surface-100 dark:hover:bg-gray-800 cursor-pointer'
            ]"
            @click="(e: MouseEvent) => toggleSelect(item, e)"
        >
            <span
                v-if="selectedKeys.has(item[uniqueKey])"
                class="pi pi-arrow-right-arrow-left mr-2 text-sm rotate-90"
            ></span>
            <span class="flex-grow truncate text-sm">{{ item[labelName] }}</span>
            <Button
                v-if="removeItem"
                icon="pi pi-times"
                severity="secondary"
                size="small"
                class="text-xs"
                :class="[
                    selectedKeys.has(item[uniqueKey])
                    ? 'text-primary-100 dark:text-primary-200 hover:text-white'
                    : 'text-surface-500 hover:text-surface-400 dark:hover:text-white dark:text-gray-400'
                ]"
                @click.stop="removeItem(item)"
                aria-label="Remove Item"
            />
        </li>
        <li v-if="modelValue.length === 0" class="text-center text-gray-400 text-sm py-2 select-none">
            {{ emptyMessage ?? t('component.orderList.emptyMessage') }}
        </li>
    </ul>
</template>
