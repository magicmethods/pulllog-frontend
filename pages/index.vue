<script setup lang="ts">
import { DateTime } from "luxon"
import { ulid } from "ulid"
import { useI18n } from "vue-i18n"
import { useGlobalStore } from "~/stores/globalStore"
import { useLoaderStore } from "~/stores/useLoaderStore"

definePageMeta({
    layout: "landing",
})

// Stores & etc.
const { t } = useI18n()
const { demoLogin } = useAuth()
const globalStore = useGlobalStore()
const loaderStore = useLoaderStore()
const appConfig = useConfig()

// Ref & Local variables
const isLoading = ref<boolean>(false)
const loaderId = ref<string | null>(null)
const seedTimestamp = DateTime.fromISO("2025-08-21T08:25:00").toUnixInteger()
const imageCacheParam = ref<string>(ulid(seedTimestamp))

// Methods
async function onClickGetStarted() {
    isLoading.value = true
    try {
        await navigateTo("/auth/login")
    } finally {
        //isLoading.value = false
    }
}
async function onClickDemo() {
    isLoading.value = true
    globalStore.setLoading(isLoading.value, t("app.loggingIn"))
    try {
        await demoLogin()
    } catch (e) {
        console.error("Demo login failed:", e)
    } finally {
        if (loaderId.value) {
            loaderStore.hide(loaderId.value)
        }
        //globalStore.setLoading(false)
        //isLoading.value = false
    }
}

onBeforeUnmount(() => {
    globalStore.setLoading(false)
    isLoading.value = false
})

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adType: "none",
        adClient: appConfig.adsenseAccount,
        //adSlotName: '5664134061',
    },
    bottom: {
        adType: "none",
        adClient: appConfig.adsenseAccount,
        //adSlotName: '5664134061',
    },
}

// Styles
const btnClass = computed(() => {
    // btn-outlined
    return [
        "btn btn-outlined",
        "mb-0 text-lg",
        `
    bg-transparent text-primary-50 dark:text-gray-100 hover:text-white dark:hover:text-gray-50
    border border-white dark:border-gray-50
    focus:ring-surface-400/50 dark:focus:ring-surface-400/30
    hover:bg-primary-600 dark:hover:bg-primary-700 hover:border-primary-200 dark:hover:border-primary-100
  `,
    ].join(" ")
})
const btnClassAlt = computed(() => {
    // btn-alt-outlined
    return [
        "btn btn-alt-outlined",
        "mb-0 text-lg",
        `
    bg-transparent text-primary-700 dark:text-gray-100 hover:text-white dark:hover:text-gray-50
    border border-primary-700 dark:border-gray-50
    focus:ring-surface-400/50 dark:focus:ring-surface-400/30
    hover:bg-primary-500 dark:hover:bg-primary-600 hover:border-primary-400 dark:hover:border-primary-100
  `,
    ].join(" ")
})
const alertClass = computed(() => {
    return [
        "py-1.5 px-6 font-bold text-xl",
        `
    bg-rose-300/20 dark:bg-rose-300/10 text-rose-500 dark:text-rose-400
    border-2 rounded-full border-rose-500/60 dark:border-rose-400/60
    outline-none shadow-none select-none
  `,
    ].join(" ")
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
        <div class="flex flex-wrap sm:flex-nowrap gap-6">
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
        <div v-if="false" :class="alertClass">{{ t('landing.hero.alert') }}</div>
      </div>
    </section>

    <div class="mt-auto pb-2 w-full min-h-max">
      <CommonEmbedAd v-bind="adConfig.default" />
    </div>

    <LpAbout />

    <LpGallery :imageCacheParam="imageCacheParam" />

    <LpSteps :imageCacheParam="imageCacheParam" />

    <LpFaq v-if="false" />

    <LpStatistics :imageCacheParam="imageCacheParam" />

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
