<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'
import { useI18n } from 'vue-i18n'

// Props & Emits
const props = defineProps<{
    isDarkMode: boolean
}>()
const emit = defineEmits<{
    (e: 'update:isDarkMode', value: boolean): void
    (e: 'open-settings'): void
}>()

// Stores
const userStore = useUserStore()

// i18n
const { t } = useI18n()

// Refs & Local variables
const animationClass = computed(() => {
    const classes = ['beat', 'bounce', 'breath', 'metronome', 'swing', 'spin', 'swim', 'tick', 'jelly', 'jingle', 'wrench' ]
    return `ld-${classes[Math.floor(Math.random() * classes.length)]}`
})
const naviLinks = computed(() => ([
    { name: t('options.homepage.apps'), icon: 'pi pi-crown', symbol: '🎮', prefix: 'symbol', path: '/apps' },
    { name: t('options.homepage.history'), icon: 'pi pi-trophy', symbol: '📝', prefix: 'symbol', path: '/history' },
    { name: t('options.homepage.stats'), icon: 'pi pi-chart-line', symbol: '📈', prefix: 'symbol', path: '/stats' },
]))
const homePage = computed(() => userStore.user?.homePage ?? naviLinks.value[0].path)

// Methods
const avatarProps = () => {
    const avatarProps = {
        size: 'normal',
        shape: 'circle',
    }
    if (userStore.user?.avatarUrl) {
        return { ...avatarProps, image: userStore.user.avatarUrl }
    }
    if (userStore.user?.name) {
        return { ...avatarProps, label: userStore.user.name.substring(0, 1).toLocaleUpperCase() }
    }
    return { ...avatarProps, icon: 'pi pi-user' }
}

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
        <NuxtLink :to="homePage">
            <div class="flex items-center space-x-4">
                <img src="/images/pulllog-icon.svg" alt="PullLog" :class="['w-6 h-6 inline-block mr-2 ld', animationClass]" />
                <h1 class="text-xl font-bold">{{ t('app.name') }}</h1>
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
        <div class="flex items-center gap-4">
            <ToggleButton
                :modelValue="props.isDarkMode"
                @update:modelValue="emit('update:isDarkMode', $event)"
                onLabel="🔆"
                offLabel="🌙"
                onIcon="pi pi-sun"
                offIcon="pi pi-moon"
                size="small"
                class="min-w-8"
                :pt="toggleButtonPT('label')"
                v-blur-on-click
            />
            <Avatar
                v-bind="avatarProps()"
                @click="$emit('open-settings')"
                class="-my-2 cursor-pointer hover:opacity-80 transition-opacity duration-200 ease-in-out"
            />
        </div>
    </header>
</template>
