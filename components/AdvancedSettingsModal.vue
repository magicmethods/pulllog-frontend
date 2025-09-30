<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useBreakpoint } from "~/composables/useBreakpoint"
import { useStatsLayoutSizing } from "~/composables/useStatsLayoutSizing"

const props = defineProps<{
    visible: boolean
    tiles: StatsTileConfig[]
    tileLabels: Record<StatsTileId, string>
    sizeOptions: StatsTileSize[]
    disableSize: boolean
}>()

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void
    (e: "apply", value: StatsTileConfig[]): void
}>()

const { t } = useI18n()
const nuxtApp = useNuxtApp()
const { isMd, isLg } = useBreakpoint()
const { clampSizeForViewport } = useStatsLayoutSizing()

const dialogVisible = computed({
    get: () => props.visible,
    set: (value: boolean) => emit("update:visible", value),
})

const localTiles = ref<StatsTileConfig[]>([])
const modalListRef = ref<HTMLElement | null>(null)
let modalSortable: ReturnType<typeof nuxtApp.$sortable.create> | null = null

function cloneTiles(source: StatsTileConfig[]): StatsTileConfig[] {
    return source.map((tile) => ({ ...tile }))
}

function initializeTiles(): void {
    localTiles.value = cloneTiles(props.tiles)
}

function initModalSortable(): void {
    if (!modalListRef.value) return
    destroyModalSortable()
    modalSortable = nuxtApp.$sortable.create(modalListRef.value, {
        dataIdAttr: "data-tile-id",
        onEnd: () => {
            if (!modalListRef.value) return
            const ids = Array.from(
                modalListRef.value.querySelectorAll<HTMLElement>(
                    "[data-tile-id]",
                ),
            )
                .map((el) => el.dataset.tileId)
                .filter((id): id is StatsTileId => typeof id === "string")
            const reordered = ids
                .map((id) => localTiles.value.find((tile) => tile.id === id))
                .filter((tile): tile is StatsTileConfig => Boolean(tile))
            if (reordered.length) {
                localTiles.value = cloneTiles(reordered)
            }
        },
    })
}

function destroyModalSortable(): void {
    modalSortable?.destroy()
    modalSortable = null
}

function close(): void {
    emit("update:visible", false)
}

function apply(): void {
    emit("apply", cloneTiles(localTiles.value))
    close()
}

function handleSelectSize(id: StatsTileId, size: StatsTileSize): void {
    const tile = localTiles.value.find((item) => item.id === id)
    if (!tile) return
    tile.size = size
}

function selectedSizeForDisplay(tile: StatsTileConfig): StatsTileSize {
    return clampSizeForViewport(tile.size, {
        isMd: isMd.value,
        isLg: isLg.value,
    })
}

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            initializeTiles()
            nextTick(() => initModalSortable())
        } else {
            destroyModalSortable()
        }
    },
    { immediate: true },
)

watch(
    () => props.tiles,
    (tiles) => {
        if (!props.visible) {
            localTiles.value = cloneTiles(tiles)
        }
    },
)

onBeforeUnmount(() => {
    destroyModalSortable()
})
</script>


<template>
    <Dialog
        v-model:visible="dialogVisible"
        modal
        :header="t('stats.layout.modal.title')"
        class="stats-layout-dialog"
        :style="{ width: 'min(520px, 90vw)' }"
        :pt="{ pcCloseButton: { root: 'rounded-full text-surface-400 dark:text-gray-500 hover:bg-surface-100 dark:hover:bg-gray-800 hover:text-primary-500 dark:hover:text-primary-400' } }"
    >
        <p class="text-sm text-muted mb-4">
            {{ t('stats.layout.modal.description') }}
        </p>
        <div ref="modalListRef" class="flex flex-col gap-2">
            <div
                v-for="tile in localTiles"
                :key="tile.id"
                class="flex items-center gap-3 rounded-lg border border-surface-200 dark:border-gray-700 bg-surface-0 dark:bg-gray-900 px-3 py-2"
                :data-tile-id="tile.id"
            >
                <span class="pi pi-bars text-surface-400 dark:text-gray-500 cursor-grab" data-drag-handle></span>
                <Checkbox
                    v-model="tile.visible"
                    binary
                    :inputId="`layout-${tile.id}`"
                    class="ml-1 mt-0.5"
                />
                <label class="ml-0.5 mt-1 mb-0 text-sm flex-1" :for="`layout-${tile.id}`">
                    {{ tileLabels[tile.id] ?? tile.id }}
                </label>
                <DisplayControllerUI
                    class="ml-auto"
                    :size-options="sizeOptions"
                    :selected-size="selectedSizeForDisplay(tile)"
                    :disable-size="disableSize"
                    :is-visible="tile.visible"
                    :is-drag-mode="false"
                    :disable-drag="true"
                    :show-visibility-control="false"
                    :show-drag-control="false"
                    @select-size="(size) => handleSelectSize(tile.id, size)"
                />
            </div>
        </div>
        <template #footer>
            <div class="w-full flex justify-center items-center gap-4">
                <span class="flex-grow"></span>
                <Button
                    :label="t('stats.layout.modal.cancel')"
                    severity="secondary"
                    class="btn btn-alt"
                    @click="close"
                />
                <Button
                    :label="t('stats.layout.modal.apply')"
                    class="btn btn-primary"
                    @click="apply"
                />
                <span class="flex-grow"></span>
            </div>
        </template>
    </Dialog>
</template>
