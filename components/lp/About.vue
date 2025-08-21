<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLoaderStore } from '~/stores/useLoaderStore'

const loaderStore = useLoaderStore()
const { t } = useI18n()

const isLoading = ref<boolean>(true)
const loaderId = ref<string | null>(null)
const sectionRef = ref<HTMLElement | null>(null)

onMounted(async () => {
    loaderId.value = loaderStore.show('', sectionRef.value ?? undefined)
    await nextTick()
    loaderStore.hide(loaderId.value)
    isLoading.value = false
})

</script>

<template>
    <section id="about" ref="sectionRef" class="w-full mb-4">
      <div v-if="!isLoading" class="flex flex-col items-center justify-center gap-4">
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
              <strong class="text-[#FFE100] dark:text-yellow-300 font-semibold text-shadow-xs">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature1') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature1Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#FFE100] dark:text-yellow-300 font-semibold text-shadow-xs">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature2') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature2Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#FBCF00] dark:text-yellow-300 font-semibold text-shadow-xs">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature3') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature3Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#FBCF00] dark:text-yellow-300 font-semibold text-shadow-xs">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature4') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature4Desc') }}</p>
            </li>
            <li class="flex flex-col mb-4">
              <strong class="text-[#F0C600] dark:text-yellow-300 font-semibold text-shadow-xs">
                <i class="pi pi-check-circle mr-2"></i>{{ t('landing.about.feature5') }}
              </strong>
              <p class="ml-4">{{ t('landing.about.feature5Desc') }}</p>
            </li>
          </ul>
        </Fieldset>
      </div>
    </section>
</template>
