<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useLoaderStore } from '~/stores/useLoaderStore'
import { useI18n } from 'vue-i18n'
import { sleep } from '~/utils/timing'

// Props & Emits
const props = defineProps<{
    src: string // Markdownファイルのパス
    title?: string
    visible: boolean
    width?: string
    maxWidth?: string
}>()
const emit = defineEmits<
    (e: 'update:visible', v: boolean) => void
>()

// Stores etc.
const loaderStore = useLoaderStore()
const { t } = useI18n()

// State
const loading = ref<boolean>(false)
const content = ref<string>('')
const isMaximized = ref<boolean>(false)

const dialogStyle = computed(() => {
    // maximize中はstyleを空にしてPrimeVueのデフォルトに委譲
    if (isMaximized.value) return {}
    return {
        width: props.width || '60vw',
        maxWidth: props.maxWidth || '640px',
    }
})

// Methods
async function fetchMarkdown() {
    loading.value = true
    await nextTick()
    const lid = loaderStore.show(t('modal.document.loading'), document.getElementById('document-loading-container') as HTMLElement)
    try {
        const res = await fetch(props.src)
        const md = await res.text()
        const html = await marked.parse(md)
        content.value = DOMPurify.sanitize(html)
        //console.log('Markdown fetched and sanitized:', html, content.value)
    } catch (e: unknown) {
        content.value = e instanceof Error ? e.message : t('modal.document.error')
        console.error('Markdown fetch error:', e)
    } finally {
        const appConfig = useConfig()
        if (appConfig.isDebug) {
            await sleep(300) // Simulate delay
        }
        loaderStore.hide(lid)
        loading.value = false
    }
}
function onMaximize() {
    isMaximized.value = true
}
function onUnmaximize() {
    isMaximized.value = false
}

// Lifecycle Hooks
onMounted(() => {
    if (props.visible) fetchMarkdown()
})

// Watchers
watch(
    () => props.visible,
    (v) => {
        if (v) fetchMarkdown()
    }
)

</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(v: boolean) => emit('update:visible', v)"
        modal
        :header="title"
        :maximizable="true"
        :style="dialogStyle"
        :dismissableMask="true"
        @maximize="onMaximize"
        @unmaximize="onUnmaximize"
    >
        <div class="markdown-body" v-if="!loading" v-html="content" />
        <div v-else id="document-loading-container"></div>
        <template #footer>
            <Button :label="t('modal.document.close')" @click="emit('update:visible', false)" class="btn btn-alt" />
        </template>
    </Dialog>
</template>
