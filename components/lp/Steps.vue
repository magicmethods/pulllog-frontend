<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLoaderStore } from '~/stores/useLoaderStore'

const loaderStore = useLoaderStore()
const { t } = useI18n()

const props = defineProps<{
    imageCacheParam: string
}>()

const isLoading = ref<boolean>(true)
const loaderId = ref<string | null>(null)
const sectionRef = ref<HTMLElement | null>(null)

const ver = computed(() => `?v=${encodeURIComponent(props.imageCacheParam)}`)

onMounted(async () => {
    loaderId.value = loaderStore.show('', sectionRef.value ?? undefined)
    await nextTick()
    loaderStore.hide(loaderId.value)
    isLoading.value = false
})

// PassThrough
const imagePT = (rootSizeClass?: string | null) => ({
  root: rootSizeClass ?? 'w-full h-auto',
  image: 'w-auto h-auto rounded-lg shadow-md',
  previewIcon: 'text-primary-500 hover:text-primary-400',
  zoomInButton: 'hidden',
  zoomOutButton: 'hidden',
  originalContainer: 'mx-4 md:mx-auto rounded-lg shadow-lg overflow-hidden',
})
const stepItemPT = { root: 'mb-2' }
const stepPT = {
    number: 'text-primary-400 dark:text-surface-500 font-bold text-xl border-2 border-primary-400 dark:border-surface-600 bg-white dark:bg-gray-50/90',
    title: 'text-primary-600 dark:text-primary-300 font-bold text-2xl'
}
const stepPanelPT = {
    root: 'bg-transparent mr-auto pl-4 py-2',
    content: 'pl-6 pr-2 w-full flex flex-col justify-start items-start',
}
// Styles
const stepButtonClass = 'btn btn-primary w-auto sm:w-max hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shadow-sm'
const stepPanelBody   = 'flex justify-between items-start gap-4 h-max p-2'
const stepPanelPClass = 'w-full flex-grow text-primary-600 dark:text-primary-50'
const stepPanelFooter = 'pt-6 pb-2 px-2 flex gap-4'

</script>

<template>
    <section id="steps" ref="sectionRef" class="w-full mb-4">
        <div v-if="!isLoading" class="flex flex-col items-center justify-center gap-4">
            <h2 class="text-primary-800 dark:text-primary-300 font-bold text-3xl text-center">
                <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-8 h-8 inline-block mr-2 ld ld-measure" />
                {{ t('landing.steps.title') }}
            </h2>
            <p class="py-4 text-xl text-white dark:text-white text-center">{{ t('landing.steps.description') }}</p>
            <Stepper
                value="1"
                :pt="{ root: 'w-full md:max-w-2xl mx-auto my-4', separator: 'ml-0.5 bg-surface-500/40' }"
            >
                <StepItem value="1" :pt="stepItemPT">
                    <Step :pt="stepPT">{{ t('landing.steps.step1.title') }}</Step>
                    <StepPanel v-slot="{ activateCallback }" :pt="stepPanelPT">
                        <div :class="stepPanelBody">
                            <Image :src="`/images/step1-image.webp${ver}`" :alt="t('landing.steps.step1.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-auto max-w-1/2')" />
                            <p :class="stepPanelPClass">{{ t('landing.steps.step1.description') }}</p>
                        </div>
                        <div :class="stepPanelFooter">
                            <Button
                                :label="t('landing.steps.next')"
                                icon="pi pi-arrow-down ld ld-wander-v"
                                :class="stepButtonClass"
                                @click="activateCallback('2')"
                            />
                        </div>
                    </StepPanel>
                </StepItem>
                <StepItem value="2" :pt="stepItemPT">
                    <Step :pt="stepPT">{{ t('landing.steps.step2.title') }}</Step>
                    <StepPanel v-slot="{ activateCallback }" :pt="stepPanelPT">
                        <div :class="[stepPanelBody, 'flex-wrap']">
                            <Image :src="`/images/step2-image.webp${ver}`" :alt="t('landing.steps.step2.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-full sm:w-auto max-w-full')" />
                            <p :class="stepPanelPClass">{{ t('landing.steps.step2.description') }}</p>
                        </div>
                        <div :class="stepPanelFooter">
                            <Button
                                :label="t('landing.steps.next')"
                                icon="pi pi-arrow-down ld ld-wander-v"
                                :class="stepButtonClass"
                                @click="activateCallback('3')"
                            />
                            <Button
                                :label="t('landing.steps.prev')"
                                icon="pi pi-arrow-up ld ld-shake-v"
                                :class="stepButtonClass"
                                @click="activateCallback('1')"
                            />
                        </div>
                    </StepPanel>
                </StepItem>
                <StepItem value="3" :pt="stepItemPT">
                    <Step :pt="stepPT">{{ t('landing.steps.step3.title') }}</Step>
                    <StepPanel v-slot="{ activateCallback }" :pt="stepPanelPT">
                        <div :class="stepPanelBody">
                            <Image :src="`/images/step3-image.webp${ver}`" :alt="t('landing.steps.step3.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-auto max-w-1/2')" />
                            <p :class="stepPanelPClass">{{ t('landing.steps.step3.description') }}</p>
                        </div>
                        <div :class="stepPanelFooter">
                            <Button
                                :label="t('landing.steps.next')"
                                icon="pi pi-arrow-down ld ld-wander-v"
                                :class="stepButtonClass"
                                @click="activateCallback('4')"
                            />
                            <Button
                                :label="t('landing.steps.prev')"
                                icon="pi pi-arrow-up ld ld-shake-v"
                                :class="stepButtonClass"
                                @click="activateCallback('2')"
                            />
                        </div>
                    </StepPanel>
                </StepItem>
                <StepItem value="4" :pt="stepItemPT">
                    <Step :pt="stepPT">{{ t('landing.steps.step4.title') }}</Step>
                    <StepPanel v-slot="{ activateCallback }" :pt="stepPanelPT">
                        <div :class="[stepPanelBody, 'flex-wrap']">
                            <Image :src="`/images/step4-image.webp${ver}`" :alt="t('landing.steps.step4.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-full sm:w-auto max-w-full')" />
                            <p :class="stepPanelPClass">{{ t('landing.steps.step4.description') }}</p>
                        </div>
                        <div :class="stepPanelFooter">
                            <Button
                                :label="t('landing.steps.prev')"
                                icon="pi pi-arrow-up ld ld-shake-v"
                                :class="stepButtonClass"
                                @click="activateCallback('3')"
                            />
                        </div>
                    </StepPanel>
                </StepItem>
            </Stepper>
        </div>
    </section>
</template>
