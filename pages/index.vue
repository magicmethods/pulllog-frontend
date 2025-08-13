<script setup lang="ts">
import { useI18n } from 'vue-i18n'

definePageMeta({
    layout: 'landing'
})

const appConfig = useConfig()
const { t, locale } = useI18n()

// PassThrough
const imagePT = {
  image: 'w-full h-auto rounded-lg shadow-md',
  previewIcon: 'text-primary-500 hover:text-primary-400',
  zoomInButton: 'hidden',
  zoomOutButton: 'hidden',
}

// Ad Setting
const adConfig: Record<string, AdProps> = {
    default: {
        adType: 'slot',
        adClient: appConfig.adsenseAccount,
        adSlotName: '8956575261',
    },
    bottom: {
        adType: 'slot',
        adClient: appConfig.adsenseAccount,
        adSlotName: '5664134061',
    }
}

</script>

<template>
  <main class="w-full md:w-4/5 flex flex-col justify-start items-stretch gap-12">
    <Head>
      <Title>{{ `${t('app.name')} - ${t('app.slogan')}` }}</Title>
      <Meta name="description" :content="t('app.description')" />
    </Head>
    <section id="hero" class="w-full h-80 flex justify-center items-center">
      <div class="flex flex-col items-center justify-center gap-4">
        <h1 class="text-white font-bold text-3xl text-center">{{ t('app.slogan') }}</h1>
        <h3 class="text-white font-semibold text-xl text-center">{{ t('app.tagline') }}</h3>
        <div class="flex gap-4">
          <NuxtLink to="/auth/login" class="btn btn-primary mb-0 w-32 hover:bg-primary-600/60 dark:hover:bg-primary-500/50">
            {{ t('landing.hero.getStarted') }}
          </NuxtLink>
          <NuxtLink v-if="false" to="/demo" class="btn btn-secondary mb-0 w-32 hover:bg-secondary-600/60 dark:hover:bg-secondary-500/50">
            {{ t('landing.hero.tryDemo') }}
          </NuxtLink>
        </div>
        <Message severity="error" class="mt-2 py-1 px-4 rounded-lg">
          {{ t('landing.hero.alert') }}
        </Message>
      </div>
    </section>

    <div class="mt-auto pb-2 w-full min-h-max">
      <CommonEmbedAd v-bind="adConfig.default" />
    </div>

    <section id="about" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-2xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-swing" />
          {{ t('landing.about.title') }}
        </h2>
        <p class="text-white text-center">{{ t('landing.about.description') }}</p>
        <div>
          <h3 class="text-primary-800 dark:text-primary-300 font-bold">{{ t('landing.about.features') }}</h3>
          <ul class="list-disc list-inside mt-4">
            <li class="flex flex-col mb-2">
              <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.about.feature1') }}</strong>
              <p class="ml-4">{{ t('landing.about.feature1Desc') }}</p>
            </li>
            <li class="flex flex-col mb-2">
              <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.about.feature2') }}</strong>
              <p class="ml-4">{{ t('landing.about.feature2Desc') }}</p>
            </li>
            <li class="flex flex-col mb-2">
              <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.about.feature3') }}</strong>
              <p class="ml-4">{{ t('landing.about.feature3Desc') }}</p>
            </li>
            <li class="flex flex-col mb-2">
              <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.about.feature4') }}</strong>
              <p class="ml-4">{{ t('landing.about.feature4Desc') }}</p>
            </li>
            <li class="flex flex-col mb-2">
              <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.about.feature5') }}</strong>
              <p class="ml-4">{{ t('landing.about.feature5Desc') }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section id="gallery" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-2xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-tick" />
          {{ t('landing.gallery.title') }}
        </h2>
        <p class="text-primary-800 dark:text-primary-300 text-center">{{ t('landing.gallery.description') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <Image src="/images/gallery-image1.png" :alt="t('landing.gallery.image1Caption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT" />
          <Image src="/images/gallery-image2.png" :alt="t('landing.gallery.image2Caption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT" />
          <Image src="/images/gallery-image3.png" :alt="t('landing.gallery.image3Caption')" preview zoomInDisabled zoomOutDisabled :pt="imagePT" />
        </div>
        <p class="text-primary-800 dark:text-primary-400 text-center mt-4">{{ t('landing.gallery.note') }}</p>
      </div>
    </section>

    <section id="steps" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-2xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-measure" />
          {{ t('landing.steps.title') }}
        </h2>
        <ul class="list-decimal mt-4">
          <li class="flex flex-col mb-4">
            <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.steps.step1.title') }}</strong>
            <p class="ml-4 text-primary-600 dark:text-primary-50">{{ t('landing.steps.step1.description') }}</p>
          </li>
          <li class="flex flex-col mb-4">
            <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.steps.step2.title') }}</strong>
            <p class="ml-4 text-primary-600 dark:text-primary-50">{{ t('landing.steps.step2.description') }}</p>
          </li>
          <li class="flex flex-col mb-4">
            <strong class="text-primary-800 dark:text-yellow-300 font-semibold">{{ t('landing.steps.step3.title') }}</strong>
            <p class="ml-4 text-primary-600 dark:text-primary-50">{{ t('landing.steps.step3.description') }}</p>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="false" id="faq" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 font-bold text-2xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-swing" />
          {{ t('landing.faq.title') }}
        </h2>
        <p class="text-primary-800 text-center">{{ t('landing.faq.description') }}</p>
        <ul class="list-disc list-inside mt-4">
          <li>{{ t('landing.faq.question1') }}<br>{{ t('landing.faq.answer1') }}</li>
          <li>{{ t('landing.faq.question2') }}<br>{{ t('landing.faq.answer2') }}</li>
          <li>{{ t('landing.faq.question3') }}<br>{{ t('landing.faq.answer3') }}</li>
        </ul>
      </div>
    </section>

    <section id="statistics" class="w-full mb-4">
      <div class="flex flex-col items-center justify-center gap-4">
        <h2 class="text-primary-800 dark:text-primary-300 font-bold text-2xl text-center">
          <img src="/images/pulllog-icon.svg" alt="Pulllog Icon" class="w-6 h-6 inline-block mr-2 ld ld-jump" />
          {{ t('landing.statistics.title') }}
        </h2>
        <p class="text-primary-800 dark:text-primary-300 text-center">{{ t('landing.statistics.description') }}</p>
      </div>
    </section>

    <div class="mt-auto pb-2 w-full min-h-max">
      <h3 class="text-amber-600 dark:text-yellow-500 font-bold text-3xl text-center mb-6">
        {{ t('landing.hero.cheering') }}
      </h3>
      <NuxtLink to="/auth/login" class="btn btn-primary mb-0 w-32 hover:bg-primary-600/60 dark:hover:bg-primary-500/50">
        {{ t('landing.hero.getStarted') }}
      </NuxtLink>
    </div>

    <div class="mt-auto pb-2 w-full min-h-max h-[90px]">
      <CommonEmbedAd v-bind="adConfig.bottom" />
    </div>

  </main>
</template>
