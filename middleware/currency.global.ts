import { useCurrencyStore } from "~/stores/useCurrencyStore"

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta?.requiresCurrency) {
    const store = useCurrencyStore()
    try { await store.ensureLoaded() } catch (e) { console.error(e) }
  }
})
