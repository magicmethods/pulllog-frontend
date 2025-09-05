import { useUserStore } from "~/stores/useUserStore"

export function useAdManager(disableForPlan?: string) {
    const userStore = useUserStore()
    // disableForPlan: 'premium' など指定時、そのプランなら広告非表示
    const isShownAd = computed(() =>
        disableForPlan
            ? userStore.user?.plan !== disableForPlan
            : /^(free|demo)$/i.test(userStore.user?.plan || "free"),
    )
    return { isShownAd }
}
