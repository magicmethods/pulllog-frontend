import { storeToRefs } from "pinia"
import { useFeatureFlagStore } from "~/stores/useFeatureFlagStore"

/**
 * Feature Flag を参照・更新するためのコンポーザブル。
 */
export function useFeatureFlag() {
    const store = useFeatureFlagStore()
    if (!store.isInitialized) {
        store.initialize()
    }

    const { flags, isFeatureFlagEnabled } = storeToRefs(store)

    /**
     * 指定したフラグが有効かどうかを判定する。
     */
    function isActive(name: FeatureFlagName): boolean {
        return store.isActive(name)
    }

    return {
        flags,
        isFeatureFlagEnabled,
        isActive,
        replaceFlags: store.replaceFlags,
        setFlag: store.setFlag,
    }
}
