<script setup lang="ts">
import { useLoaderStore } from '~/stores/useLoaderStore'
const loader = useLoaderStore()
const loaderEntries = computed(() => Array.from(loader.loaderMap.entries()))
const globalLoaders = computed(() => loaderEntries.value.filter(([_, info]) => !info.target))
const targetLoaders = computed(() => loaderEntries.value.filter(([_, info]) => info.target))
</script>

<template>
    <!-- グローバルローダー（targetがnull）を全画面に描画 -->
    <div
        v-for="[id, info] in globalLoaders"
        :key="id"
        class="loader-overlay"
    >
        <div class="loader-container">
            <span class="loader-spinner h-8 w-8 mb-3"></span>
            <span v-if="info.text !== ''" class="loader-text text-base">{{ info.text }}</span>
        </div>
    </div>
    <!-- ターゲット要素にTeleportして描画 -->
    <Teleport
        v-for="[id, info] in targetLoaders"
        :key="id"
        :to="info.target"
    >
        <div class="loader-inner-overlay">
            <div class="loader-inner-container">
                <span class="loader-spinner h-6 w-6 mb-2"></span>
                <span v-if="info.text !== ''" class="loader-text text-xs">{{ info.text }}</span>
            </div>
        </div>
    </Teleport>
</template>
