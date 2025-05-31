<script setup lang="ts">

const home = ref<{ icon: string }>({ icon: 'pi pi-home' })
const locations = ref<Record<string, string>[]>([
  { label: 'アプリ管理' },
])

</script>

<template>
    <div class="w-full mx-auto px-4 py-6">
        <!-- Page Header -->
        <div id="page-header" class="flex justify-start text-sm text-surface-500 -mt-2 mb-4">
            <Breadcrumb :home="home" :model="locations" />
        </div>
        <!-- Page Content -->
        
    </div>
</template>