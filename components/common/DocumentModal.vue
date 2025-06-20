<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useLoaderStore } from '~/stores/useLoaderStore'
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

// Stores
const loaderStore = useLoaderStore()

// State
const loading = ref<boolean>(false)
const content = ref<string>('')
const dialogStyle = computed(() => ({
    width: props.width || '60vw',
    maxWidth: props.maxWidth || '640px',
}))

// Methods
async function fetchMarkdown() {
    loading.value = true
    await nextTick()
    const lid = loaderStore.show('文書を取得中...', document.getElementById('document-loading-container') as HTMLElement)
    try {
        const res = await fetch(props.src)
        const md = await res.text()
        const html = await marked.parse(md)
        content.value = DOMPurify.sanitize(html)
        console.log('Markdown fetched and sanitized:', html, content.value)
    } catch (e: unknown) {
        content.value = e instanceof Error ? e.message : '文書を取得できませんでした。'
        console.error('Markdown fetch error:', e)
    } finally {
        await sleep(200) // Simulate delay
        loaderStore.hide(lid)
        loading.value = false
    }
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
        @update:visible="(v) => emit('update:visible', v)"
        modal
        :header="title"
        :style="dialogStyle"
        :dismissableMask="true"
    >
        <div class="markdown-body" v-if="!loading" v-html="content" />
        <div v-else id="document-loading-container"></div>
        <template #footer>
            <Button label="閉じる" @click="emit('update:visible', false)" class="btn btn-alt" />
        </template>
    </Dialog>
</template>
