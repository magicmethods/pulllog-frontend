<script setup lang="ts">
import { useUserStore } from '~/stores/useUserStore'

const userStore = useUserStore()

const home = ref<{ icon: string }>({ icon: 'pi pi-home' })
const locations = ref<Record<string, string>[]>([
  { label: '個人設定' },
])

function handleLogout() {
    userStore.logout()
    navigateTo({ path: '/auth/login' })
}

</script>

<template>
    <div class="w-full mx-auto px-4 py-6">
        <!-- Page Header -->
        <div id="page-header" class="flex justify-start text-sm text-surface-500 -mt-2 mb-4">
            <Breadcrumb :home="home" :model="locations" />
        </div>
        <!-- Page Content -->
        <div class="border rounded-lg mb-2 p-2 bg-surface-100 dark:bg-surface-800 border-surface-300 dark:border-surface-700">
            <pre class="font-mono text-sm text-surface-600 whitespace-pre-wrap">{{ JSON.stringify(userStore.user, null, 2) }}</pre>
        </div>
        <Button label="ログアウト" class="btn btn-secondary" @click="handleLogout" />
    </div>
</template>