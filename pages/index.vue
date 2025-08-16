<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useGlobalStore } from '~/stores/globalStore'
import { useLoaderStore } from '~/stores/useLoaderStore'

definePageMeta({
    layout: 'landing'
})

// Stores & etc.
const { t } = useI18n()
const { demoLogin } = useAuth()
const globalStore = useGlobalStore()
const loaderStore = useLoaderStore()

// Ref & Local variables
const isLoading = ref<boolean>(false)
const loaderId = ref<string | null>(null)
const imageCacheParam = ref<string>(`?v=${new Date('2025-08-16T12:36:20').getTime()}`)

// Methods
async function onClickGetStarted() {
  isLoading.value = true

  try {
    // Redirect to login page
    await navigateTo('/auth/login')
  } finally {
    isLoading.value = false
  }
}
async function onClickDemo() {
  isLoading.value = true
  globalStore.setLoading(isLoading.value, t('app.loggingIn'))
  //loaderId.value = loaderStore.show(t('app.loggingIn'))

  try {
    await demoLogin()
  } catch (e) {
    console.error('Demo login failed:', e)
    // Optionally, show an error message to the user
  } finally {
    if (loaderId.value) {
      loaderStore.hide(loaderId.value)
    }
    //isLoading.value = false
    globalStore.setLoading(false)
  }
}

// PassThrough
const imagePT = (rootSizeClass?: string | null) => ({
  root: rootSizeClass ?? 'w-full h-auto',
  image: 'w-full h-auto rounded-lg shadow-md',
  previewIcon: 'text-primary-500 hover:text-primary-400',
  zoomInButton: 'hidden',
  zoomOutButton: 'hidden',
  originalContainer: 'rounded-lg shadow-lg overflow-hidden',
})

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        //adHeight: 90,
        /*
        adType: 'slot',
        //adClient: appConfig.adsenseAccount,
        adSlotName: '8956575261',
        */
    },
    bottom: {
        //adHeight: 90,
        /*
        adType: 'slot',
        //adClient: appConfig.adsenseAccount,
        adSlotName: '5664134061',
        */
    }
}

const btnClass = computed(() => {
  // btn-outlined
  return [ 'btn btn-outlined', 'mb-0 text-lg', `
    bg-transparent text-primary-50 dark:text-gray-100 hover:text-white dark:hover:text-gray-50
    border border-white dark:border-gray-50
    focus:ring-surface-400/50 dark:focus:ring-surface-400/30
    hover:bg-primary-600 dark:hover:bg-primary-700 hover:border-primary-200 dark:hover:border-primary-100
  `].join(' ')
})
const btnClassAlt = computed(() => {
  // btn-alt-outlined
  return [ 'btn btn-alt-outlined', 'mb-0 text-lg', `
    bg-transparent text-primary-700 dark:text-gray-100 hover:text-white dark:hover:text-gray-50
    border border-primary-700 dark:border-gray-50
    focus:ring-surface-400/50 dark:focus:ring-surface-400/30
    hover:bg-primary-500 dark:hover:bg-primary-600 hover:border-primary-400 dark:hover:border-primary-100
  `].join(' ')
})
const alertClass = computed(() => {
  return [ 'py-1.5 px-6 font-bold text-xl', `
    bg-rose-300/20 dark:bg-rose-300/10 text-rose-500 dark:text-rose-400
    border-2 rounded-full border-rose-500/60 dark:border-rose-400/60
    outline-none shadow-none select-none
  `].join(' ')
})

</script>

<template>
  <main class="w-full md:w-4/5 flex flex-col justify-start items-stretch gap-24">
    <Head>
      <Title>{{ `${t('app.name')} - ${t('app.slogan')}` }}</Title>
      <Meta name="description" :content="t('app.description')" />
    </Head>
    <section id="hero" class="w-full mt-24 flex justify-center items-center">
      <div class="flex flex-col items-center justify-center gap-10">
        <h1 class="text-[#FFE936] dark:text-yellow-300 font-bold text-5xl text-center">{{ t('app.slogan') }}</h1>
        <h3 class="text-white font-semibold text-2xl text-center">{{ t('app.tagline') }}</h3>
        <div class="flex gap-6">
          <Button
            :label="t('landing.hero.getStarted')"
            icon="pi pi-sign-in ld ld-breath"
            :class="btnClass"
            @click="onClickGetStarted"
            :disabled="isLoading"
          />
          <Button
            :label="t('landing.hero.tryDemo')"
            icon="pi pi-angle-double-right ld ld-wander-h"
            :class="btnClass"
            @click="onClickDemo"
            :loading="isLoading"
            :disabled="isLoading"
          />
        </div>
        <div :class="alertClass">{{ t('landing.hero.alert') }}</div>
      </div>
    </section>

    <div class="mt-auto pb-2 w-full min-h-max">
      <CommonEmbedAd v-bind="adConfig.default" />
    </div>

    <section id="about" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-3xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-8 h-8 inline-block mr-2 ld ld-swing" />
          {{ t('landing.about.title') }}
        </h2>
        <p class="py-4 text-xl text-primary-800 dark:text-white text-center">{{ t('landing.about.description') }}</p>
        <Fieldset
          :legend="t('landing.about.features')"
          class="text-primary-800 dark:text-white font-normal text-lg"
          :pt="{
            root: 'border-solid! border-amber-400! dark:border-yellow-400! bg-gradient-to-b from-transparent to-primary-300 dark:to-primary-900/50',
            legendLabel: 'text-amber-300 dark:text-yellow-500 font-semibold text-2xl',
            contentContainer: 'p-4',
          }"
        >
          <ul> 
            <li class="flex flex-col mb-4">
              <strong class="text-[#FFE100] dark:text-yellow-300 font-semibold">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature1') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature1Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#FFE100] dark:text-yellow-300 font-semibold">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature2') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature2Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#FFD700] dark:text-yellow-300 font-semibold">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature3') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature3Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#FFD700] dark:text-yellow-300 font-semibold">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature4') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature4Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#FFD700] dark:text-yellow-300 font-semibold">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature5') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature5Desc') }}</p>
            </li>
          </ul>
        </Fieldset>
      </div>
    </section>

    <section id="gallery" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-3xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-8 h-8 inline-block mr-2 ld ld-tick" />
          {{ t('landing.gallery.title') }}
        </h2>
        <p class="py-4 text-xl text-primary-800 dark:text-white text-center">{{ t('landing.gallery.description') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-4">
          <Image :src="`/images/gallery-image1.png${imageCacheParam}`" :alt="t('landing.gallery.image1Caption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT()" />
          <Image :src="`/images/gallery-image2.png${imageCacheParam}`" :alt="t('landing.gallery.image2Caption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT()" />
          <Image :src="`/images/gallery-image3.png${imageCacheParam}`" :alt="t('landing.gallery.image3Caption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT()" />
        </div>
        <p class="text-primary-600 dark:text-primary-400 text-center mt-4">{{ t('landing.gallery.note') }}</p>
      </div>
    </section>

    <section id="steps" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-3xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-8 h-8 inline-block mr-2 ld ld-measure" />
          {{ t('landing.steps.title') }}
        </h2>
        <p class="py-4 text-xl text-primary-800 dark:text-white text-center">{{ t('landing.steps.description') }}</p>
        <Stepper
          value="1"
          :pt="{ root: 'w-full md:max-w-2xl mx-auto my-4', separator: 'ml-0.5 bg-surface-500/40' }"
        >
          <StepItem value="1" :pt="{ root: 'mb-2' }">
            <Step :pt="{
              number: 'text-primary-400 dark:text-surface-500 font-bold text-xl border-2 border-primary-400 dark:border-surface-600 bg-white dark:bg-gray-50/90',
              title: 'text-primary-600 dark:text-primary-300 font-bold text-2xl'
            }">{{ t('landing.steps.step1.title') }}</Step>
            <StepPanel v-slot="{ activateCallback }" :pt="{
              root: 'bg-transparent mr-auto pl-4 py-2',
              content: 'pl-6 pr-2 w-full flex flex-col justify-start items-start',
            }">
              <div class="flex justify-between items-start gap-4 h-max p-2">
                <Image :src="`/images/step1-image.png${imageCacheParam}`" :alt="t('landing.steps.step1.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-auto')" />
                <p class="w-full flex-grow text-primary-600 dark:text-primary-50">{{ t('landing.steps.step1.description') }}</p>
              </div>
              <div class="pt-6 pb-2 px-2 flex gap-4">
                <Button
                  :label="t('landing.steps.next')"
                  icon="pi pi-arrow-down ld ld-wander-v"
                  class="btn btn-primary w-full sm:w-max hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shadow-sm"
                  @click="activateCallback('2')"
                />
              </div>
            </StepPanel>
          </StepItem>
          <StepItem value="2" :pt="{ root: 'mb-2' }">
            <Step :pt="{
              number: 'text-primary-400 dark:text-surface-500 font-bold text-xl border-2 border-primary-400 dark:border-surface-600 bg-white dark:bg-gray-50/90',
              title: 'text-primary-600 dark:text-primary-300 font-bold text-2xl'
            }">{{ t('landing.steps.step2.title') }}</Step>
            <StepPanel v-slot="{ activateCallback }" :pt="{
              root: 'bg-transparent mr-auto pl-4 py-2',
              content: 'pl-6 pr-2 w-full flex flex-col justify-start items-start',
            }">
              <div class="flex justify-between items-start gap-4 h-max p-2">
                <Image :src="`/images/step2-image.png${imageCacheParam}`" :alt="t('landing.steps.step2.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-auto')" />
                <p class="w-full flex-grow text-primary-600 dark:text-primary-50">{{ t('landing.steps.step2.description') }}</p>
              </div>
              <div class="pt-6 pb-2 px-2 flex gap-4">
                <Button
                  :label="t('landing.steps.next')"
                  icon="pi pi-arrow-down ld ld-wander-v"
                  class="btn btn-primary w-auto sm:w-max hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shadow-sm"
                  @click="activateCallback('3')"
                />
                <Button
                  :label="t('landing.steps.prev')"
                  icon="pi pi-arrow-up ld ld-shake-v"
                  class="btn btn-primary w-auto sm:w-max hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shadow-sm"
                  @click="activateCallback('1')"
                />
              </div>
            </StepPanel>
          </StepItem>
          <StepItem value="3" :pt="{ root: 'mb-2' }">
            <Step :pt="{
              number: 'text-primary-400 dark:text-surface-500 font-bold text-xl border-2 border-primary-400 dark:border-surface-600 bg-white dark:bg-gray-50/90',
              title: 'text-primary-600 dark:text-primary-300 font-bold text-2xl'
            }">{{ t('landing.steps.step3.title') }}</Step>
            <StepPanel v-slot="{ activateCallback }" :pt="{
              root: 'bg-transparent mr-auto pl-4 py-2',
              content: 'pl-6 pr-2 w-full flex flex-col justify-start items-start',
            }">
              <div class="flex justify-between items-start gap-4 h-max p-2">
                <Image :src="`/images/step3-image.png${imageCacheParam}`" :alt="t('landing.steps.step3.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-auto')" />
                <p class="w-full flex-grow text-primary-600 dark:text-primary-50">{{ t('landing.steps.step3.description') }}</p>
              </div>
              <div class="pt-6 pb-2 px-2 flex gap-4">
                <Button
                  :label="t('landing.steps.next')"
                  icon="pi pi-arrow-down ld ld-wander-v"
                  class="btn btn-primary w-auto sm:w-max hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shadow-sm"
                  @click="activateCallback('4')"
                />
                <Button
                  :label="t('landing.steps.prev')"
                  icon="pi pi-arrow-up ld ld-shake-v"
                  class="btn btn-primary w-auto sm:w-max hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shadow-sm"
                  @click="activateCallback('2')"
                />
              </div>
            </StepPanel>
          </StepItem>
          <StepItem value="4" :pt="{ root: 'mb-2' }">
            <Step :pt="{
              number: 'text-primary-400 dark:text-surface-500 font-bold text-xl border-2 border-primary-400 dark:border-surface-600 bg-white dark:bg-gray-50/90',
              title: 'text-primary-600 dark:text-primary-300 font-bold text-2xl'
            }">{{ t('landing.steps.step4.title') }}</Step>
            <StepPanel v-slot="{ activateCallback }" :pt="{
              root: 'bg-transparent mr-auto pl-4 py-2',
              content: 'pl-6 pr-2 w-full flex flex-col justify-start items-start',
            }">
              <div class="flex justify-between items-start gap-4 h-max p-2">
                <Image :src="`/images/step4-image.png${imageCacheParam}`" :alt="t('landing.steps.step4.imageCaption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT('h-auto max-h-full w-auto')" />
                <p class="w-full flex-grow text-primary-600 dark:text-primary-50">{{ t('landing.steps.step4.description') }}</p>
              </div>
              <div class="pt-6 pb-2 px-2 flex gap-4">
                <Button
                  :label="t('landing.steps.prev')"
                  icon="pi pi-arrow-up ld ld-shake-v"
                  class="btn btn-primary w-auto sm:w-max hover:bg-primary-600/60 dark:hover:bg-primary-500/50 shadow-sm"
                  @click="activateCallback('3')"
                />
              </div>
            </StepPanel>
          </StepItem>
        </Stepper>
      </div>
    </section>

    <section v-if="false" id="faq" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
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

    <section id="statistics" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-3xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-8 h-8 inline-block mr-2 ld ld-jump" />
          {{ t('landing.statistics.title') }}
        </h2>
        <p class="py-4 text-xl text-primary-800 dark:text-primary-300 text-center">{{ t('landing.statistics.description') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 class="text-primary-800 dark:text-primary-300 font-semibold">{{ t('landing.statistics.stat1.title') }}</h3>
            <p class="text-primary-600 dark:text-primary-50">{{ t('landing.statistics.stat1.value') }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 class="text-primary-800 dark:text-primary-300 font-semibold">{{ t('landing.statistics.stat2.title') }}</h3>
            <p class="text-primary-600 dark:text-primary-50">{{ t('landing.statistics.stat2.value') }}</p>
          </div>
          <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 class="text-primary-800 dark:text-primary-300 font-semibold">{{ t('landing.statistics.stat3.title') }}</h3>
            <p class="text-primary-600 dark:text-primary-50">{{ t('landing.statistics.stat3.value') }}</p>
          </div>
        </div> 
      </div>
    </section>

    <div class="mt-auto pb-2 w-full min-h-max">
      <h3 class="text-[#F79428] dark:text-yellow-500 font-bold text-3xl text-center mb-6">
        {{ t('landing.hero.cheering') }}
      </h3>
      <Button
        :label="t('landing.hero.getStarted')"
        icon="pi pi-sign-in ld ld-breath"
        :class="btnClassAlt"
        @click="onClickGetStarted"
        :disabled="isLoading"
      />
    </div>

    <div class="mt-auto pb-2 w-full min-h-max h-[90px]">
      <CommonEmbedAd v-bind="adConfig.bottom" />
    </div>

  </main>
</template>
