/**
 * Global store
 */

export type RenderMode = 'light' | 'dark'
export type Language = 'en' | 'ja'

export const useGlobalStore = defineStore('global', () => {
    // state:
    const renderMode = ref<RenderMode>('light')
    const language = ref<Language>('ja')
    const fontFamily = ref<string>('font-sans')
    const loaderType = ref<number>(1)

    // getters:
    const isDarkMode = computed(() => renderMode.value === 'dark')
    const getUserSettings = () => {
        return {
            renderMode: renderMode.value,
            language: language.value,
            fontFamily: fontFamily.value,
            loaderType: loaderType.value,
        }
    }

    // setters:
    const setRenderMode = (mode: RenderMode) => {
        renderMode.value = mode
    }
    const setLanguage = (lang: Language) => {
        language.value = lang
    }
    const setFont = (font: string) => {
        fontFamily.value = font
    }
    const setLoaderType = (type: number) => {
        loaderType.value = type
    }

    return {
        renderMode,
        language,
        fontFamily,
        loaderType,
        isDarkMode,
        getUserSettings,
        setRenderMode,
        setLanguage,
        setFont,
        setLoaderType,
    }
})
