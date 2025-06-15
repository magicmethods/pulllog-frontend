<script setup lang="ts">

// Refs & Local variables
const isDarkMode = ref(false)
const naviLinks = [
    { name: 'アプリ管理', icon: 'pi pi-crown',      symbol: '🎮', prefix: 'symbol', path: '/apps' },
    { name: '履歴登録',   icon: 'pi pi-trophy',     symbol: '📝', prefix: 'symbol', path: '/history' },
    { name: '統計分析',   icon: 'pi pi-chart-line', symbol: '📈', prefix: 'symbol', path: '/stats' },
    { name: '個人設定',   icon: 'pi pi-cog',        symbol: '⚙️', prefix: 'symbol', path: '/settings' }
]

// Toggle a class on the <html> tag to switch rendering modes
const toggleRenderingMode = () => {
    const htmlElement = document.documentElement
    htmlElement.classList.toggle('app-dark')
    isDarkMode.value = htmlElement.classList.contains('app-dark')
}

onMounted(() => {
    // Check if the user has a preference for dark mode and set the class accordingly
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDarkMode) {
        document.documentElement.classList.add('app-dark')
        isDarkMode.value = true
    } else {
        document.documentElement.classList.remove('app-dark')
        isDarkMode.value = false
    }
})

// Pass Through
const toggleButtonPT = (content: 'label' | 'icon') => {
    return {
        icon: content === 'label' ? '!hidden': '',
        label: content === 'icon' ? '!hidden' : '',
    }
}

// Classes
const navLinkClass = 'inline-flex gap-2 items-center -my-1 py-1 px-2 rounded text-sm text-surface-100 hover:text-white hover:bg-primary-400/40 dark:hover:bg-primary-500/40'

</script>

<template>
    <header class="flex items-center justify-between p-4 bg-primary-500 dark:bg-primary-700 text-white shadow-md">
        <NuxtLink to="/history">
            <div class="flex items-center space-x-4">
                <img src="/images/pulllog-icon.svg" alt="PullLog" class="w-6 h-6 inline-block mr-2 ld ld-swing" />
                <h1 class="text-xl font-bold">PullLog</h1>
            </div>
        </NuxtLink>
        <nav id="navi-links" class="flex-1 flex justify-end items-center px-4 gap-4">
            <NuxtLink
                v-for="(link, index) in naviLinks"
                :key="index"
                :to="link.path"
                :class="navLinkClass"
                :ariaCurrent="link.path === $route.path ? 'true' : 'false'"
            >
                <i v-if="link.prefix === 'icon'" :class="link.icon"></i>
                <span v-else>{{ link.symbol }}</span>
                <span class="hidden md:inline-block">{{ link.name }}</span>
            </NuxtLink>
        </nav>
        <div class="flex items-center gap-2">
            <ToggleButton
                v-model="isDarkMode"
                onLabel="🔆"
                offLabel="🌙"
                onIcon="pi pi-sun"
                offIcon="pi pi-moon"
                size="small"
                @click="toggleRenderingMode"
                class="min-w-8"
                :pt="toggleButtonPT('label')"
                v-blur-on-click
            />
        </div>
    </header>
</template>

<style lang="scss" scoped>
#navi-links {
    a[aria-current="true"] {
        background-color: color-mix(in srgb, var(--p-primary-950) 5%, transparent);
        color: color-mix(in srgb, var(--p-primary-100) 50%, transparent);

        &:hover {
            background-color: color-mix(in srgb, var(--p-primary-500) 40%, transparent);
            color: var(--p-primary-200);
        }
    }
}
</style>