import { ulid } from "ulid"
//import { useI18n } from 'vue-i18n'

export const useLoaderStore = defineStore("loader", () => {
    // i18n
    //const { t } = useI18n()
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)

    // Map<LoaderId, LoaderInfo>
    const loaderMap = ref<Map<string, LoaderInfo>>(new Map())
    const defaultLoadingText = t("app.loading")

    // State
    const isLoading = computed<boolean>(() => loaderMap.value.size > 0) // 現在1つでもローダーがあればtrue

    // Actions
    // 最後に追加されたローダーの情報（グローバルUI用に参照）
    const currentLoader = computed<LoaderInfo>(() => {
        const values = Array.from(loaderMap.value.values())
        return values.length
            ? values[values.length - 1] // 最後に追加されたローダー情報を返す
            : { text: defaultLoadingText, target: null } // デフォルトのローダー情報
    })
    // ローダー表示: 新しいIDを発行してMapに追加
    function show(
        text: string = defaultLoadingText,
        target?: HTMLElement | null,
    ): string {
        const id = ulid()
        let targetElement = null
        if (target instanceof HTMLElement) {
            // ターゲットが指定されている場合はその要素にクラスを追加
            targetElement = target
            targetElement.classList.add("loader-shown")
        }
        loaderMap.value.set(id, { text, target: targetElement })
        return id
    }
    // ローダー非表示: IDを指定してMapから削除
    function hide(id: string): void {
        const loaderInfo = loaderMap.value.get(id)
        if (loaderInfo?.target) {
            // ターゲット要素が存在する場合は要素からクラスを削除
            loaderInfo.target.classList.remove("loader-shown")
        }
        loaderMap.value.delete(id)
    }
    // 全ローダーを強制的に閉じる
    function reset(): void {
        // 全てのローダーを非表示にするため、各ターゲット要素からクラスを削除
        loaderMap.value.forEach((loaderInfo, _) => {
            if (loaderInfo.target) {
                loaderInfo.target.classList.remove("loader-shown")
            }
        })
        loaderMap.value.clear()
    }

    return {
        isLoading,
        currentLoader,
        show,
        hide,
        reset,
        // デバッグや個別参照用
        loaderMap,
    }
})
