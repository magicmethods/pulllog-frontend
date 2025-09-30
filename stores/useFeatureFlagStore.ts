import { useConfig } from "~/composables/useConfig"

const DEFAULT_FLAGS: FeatureFlagMap = {
    StatsLayoutSync: false,
}

export const useFeatureFlagStore = defineStore("featureFlag", () => {
    const config = useConfig()
    const isFeatureFlagEnabled = ref<boolean>(config.useFeatureFlag)
    const flags = ref<FeatureFlagMap>({ ...DEFAULT_FLAGS })
    const isInitialized = ref<boolean>(false)

    /**
     * 環境変数からFeature Flagのリストを抽出する。
     */
    function parseFeatureList(list: string): FeatureFlagName[] {
        if (!list) return []
        const trimmed = list
            .split(",")
            .map((key) => key.trim())
            .filter((key): key is string => key.length > 0)
        const unique = Array.from(new Set(trimmed))
        return unique.map((key) => key as FeatureFlagName)
    }

    /**
     * 環境変数に基づいて初期フラグ状態を構築する。
     */
    function buildInitialFlags(): FeatureFlagMap {
        const next: FeatureFlagMap = { ...DEFAULT_FLAGS }
        if (!config.useFeatureFlag) return next
        for (const key of parseFeatureList(config.newFeatures)) {
            next[key] = true
        }
        return next
    }

    /**
     * 初期化済みでない場合に環境変数から設定を読み取り、状態を初期化する。
     */
    function initialize(): void {
        if (isInitialized.value) return
        flags.value = buildInitialFlags()
        isFeatureFlagEnabled.value = config.useFeatureFlag
        isInitialized.value = true
    }

    /**
     * フラグ全体を置き換える。必要に応じて有効状態も更新する。
     */
    function replaceFlags(next: FeatureFlagMap, enabled?: boolean): void {
        flags.value = { ...DEFAULT_FLAGS, ...next }
        if (enabled !== undefined) {
            isFeatureFlagEnabled.value = enabled
        }
    }

    /**
     * 単一のフラグを更新する。
     */
    function setFlag(name: FeatureFlagName, enabled: boolean): void {
        flags.value = { ...flags.value, [name]: enabled }
    }

    /**
     * 指定されたフラグが有効かどうかを返す。
     */
    function isActive(name: FeatureFlagName): boolean {
        if (!isFeatureFlagEnabled.value) return false
        return flags.value[name] ?? false
    }

    initialize()

    return {
        flags,
        isFeatureFlagEnabled,
        isInitialized,
        initialize,
        replaceFlags,
        setFlag,
        isActive,
    }
})
