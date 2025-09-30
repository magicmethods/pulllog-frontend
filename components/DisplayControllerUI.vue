<script setup lang="ts">
import type { OverlayPanelMethods } from "primevue/overlaypanel"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useStatsLayoutSizing } from "~/composables/useStatsLayoutSizing"

const props = withDefaults(
    defineProps<{
        sizeOptions: StatsTileSize[]
        selectedSize: StatsTileSize
        disableSize: boolean
        isVisible: boolean
        isDragMode: boolean
        disableDrag: boolean
        showDragControl?: boolean
        showVisibilityControl?: boolean
    }>(),
    {
        showDragControl: true,
        showVisibilityControl: true,
    },
)

const emit = defineEmits<{
    (e: "select-size", size: StatsTileSize): void
    (e: "toggle-visibility"): void
    (e: "toggle-drag"): void
}>()

const overlayRef = ref<OverlayPanelMethods | null>(null)
const { t } = useI18n()
const { toSpanValue } = useStatsLayoutSizing()

const hasSizeOptions = computed(() => props.sizeOptions.length > 0)
const shouldShowDragControl = computed(() => props.showDragControl)
const shouldShowVisibilityControl = computed(() => props.showVisibilityControl)
const dragHandleActive = computed(
    () => shouldShowDragControl.value && props.isDragMode,
)
const dragIcon = computed(() =>
    props.isDragMode ? "pi pi-arrows-alt" : "pi pi-lock",
)
const visibilityIcon = computed(() =>
    props.isVisible ? "pi pi-eye-slash" : "pi pi-eye",
)
const tooltipConfig = computed(() => ({
    value: t("stats.layout.controls.restoreHint"),
    escape: false,
    pt: {
        root: "pb-1",
        text: "w-max max-w-[12rem] p-3 bg-surface-600 text-white dark:bg-gray-800 dark:shadow-lg font-medium text-xs",
        arrow: "w-2 h-2 rotate-[-45deg] border-b border-4 border-surface-600 dark:border-gray-800",
    },
}))

function toggleSizeMenu(event: MouseEvent): void {
    if (!hasSizeOptions.value || props.disableSize) return
    overlayRef.value?.toggle(event)
}

function handleSelectSize(option: StatsTileSize): void {
    emit("select-size", option)
    overlayRef.value?.hide()
}

function handleToggleVisibility(): void {
    emit("toggle-visibility")
}

function handleToggleDrag(): void {
    if (props.disableDrag) return
    emit("toggle-drag")
}

function translateSize(size: StatsTileSize): string {
    return t(`stats.layout.size.${size}`)
}
</script>

<template>
    <div
        class="flex items-center gap-1"
        :data-drag-handle="dragHandleActive ? '' : null"
    >
        <Button
            v-if="hasSizeOptions"
            icon="pi pi-expand"
            rounded
            severity="secondary"
            class="w-8 h-8 text-surface-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 bg-transparent hover:bg-surface-100 dark:hover:bg-gray-900/40"
            :aria-label="t('stats.layout.controls.size')"
            @click="toggleSizeMenu"
            :disabled="disableSize"
        />
        <OverlayPanel
            v-if="hasSizeOptions"
            ref="overlayRef"
            :showCloseIcon="false"
            class="overflow-hidden"
        >
            <div class="flex flex-col gap-1 min-w-[200px] bg-surface-0 dark:bg-gray-950 p-1">
                <Button
                    v-for="option in sizeOptions"
                    :key="option"
                    :class="['size-option w-full justify-start', { 'is-active-size bg-primary-200/40 dark:bg-primary-800/20 hover:bg-surface-100 dark:hover:bg-gray-900': selectedSize === option }]"
                    :severity="selectedSize === option ? 'primary' : 'secondary'"
                    @click="handleSelectSize(option)"
                    :pt="{
                        root: 'px-3 py-2 w-full justify-start hover:bg-surface-100 dark:hover:bg-gray-900',
                    }"
                >
                    <div class="flex items-center justify-between w-full gap-3">
                        <span class="text-sm font-medium">
                            {{ translateSize(option) }}
                        </span>
                        <StatsTileSizePreview :span="toSpanValue(option)" />
                    </div>
                </Button>
            </div>
        </OverlayPanel>
        <Button
            v-if="shouldShowVisibilityControl"
            :icon="visibilityIcon"
            rounded
            severity="secondary"
            class="w-8 h-8 text-surface-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-500 bg-transparent hover:bg-surface-100 dark:hover:bg-gray-900/40"
            :aria-label="t('stats.layout.controls.visibility')"
            v-tooltip.top="tooltipConfig"
            @click="handleToggleVisibility"
        />
        <Button
            v-if="shouldShowDragControl"
            :icon="dragIcon"
            rounded
            :severity="isDragMode ? 'primary' : 'secondary'"
            class="w-8 h-8 text-surface-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 bg-transparent hover:bg-surface-100 dark:hover:bg-gray-900/40"
            :class="{ 'text-primary-600! dark:text-primary-400! cursor-move!': isDragMode }"
            :aria-label="
                isDragMode
                    ? t('stats.layout.controls.dragDisable')
                    : t('stats.layout.controls.dragEnable')
            "
            :disabled="disableDrag"
            @click="handleToggleDrag"
        />
    </div>
</template>
