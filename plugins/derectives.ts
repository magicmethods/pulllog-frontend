import { defineNuxtPlugin } from 'nuxt/app'
import { vBlurOnClick } from '~/directives/v-blur-on-click'

export default defineNuxtPlugin(nuxtApp => {
    nuxtApp.vueApp.directive('blur-on-click', vBlurOnClick)
})
