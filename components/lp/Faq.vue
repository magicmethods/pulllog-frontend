<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { useLoaderStore } from "~/stores/useLoaderStore"

const loaderStore = useLoaderStore()
const { t } = useI18n()

const isLoading = ref<boolean>(true)
const loaderId = ref<string | null>(null)
const sectionRef = ref<HTMLElement | null>(null)

onMounted(async () => {
    loaderId.value = loaderStore.show("", sectionRef.value ?? undefined)
    await nextTick()
    loaderStore.hide(loaderId.value)
    isLoading.value = false
})
</script>

<template>
    <section id="faq" ref="sectionRef" class="w-full mb-4">
        <div v-if="!isLoading" class="flex flex-col items-center justify-center gap-4">
            <h2 class="text-primary-800 font-bold text-3xl text-center">
                <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-swing" />
                {{ t('landing.faq.title') }}
            </h2>
            <p class="py-4 text-xl text-primary-800 text-center">{{ t('landing.faq.description') }}</p>
            <ul class="list-disc list-inside mt-4">
                <li>{{ t('landing.faq.question1') }}<br>{{ t('landing.faq.answer1') }}</li>
                <li>{{ t('landing.faq.question2') }}<br>{{ t('landing.faq.answer2') }}</li>
                <li>{{ t('landing.faq.question3') }}<br>{{ t('landing.faq.answer3') }}</li>
            </ul>
        </div>
    </section>
</template>
