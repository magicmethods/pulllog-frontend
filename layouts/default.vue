<script setup lang="ts">

const router = useRouter()
const mainContainer = ref<HTMLElement | null>(null)

// Watch page transitions and reset scroll position
router.afterEach(() => {
    if (mainContainer.value) {
        mainContainer.value.scrollTop = 0
        mainContainer.value.scrollLeft = 0
    }
})
</script>

<template>
    <div id="app-container">
        <CommonHeader />
        <main
            ref="mainContainer"
            class="w-full flex flex-col justify-between overflow-y-auto dark:bg-[#070D19]"
            style="height: calc(100vh - 60px);"
        >
            <slot />
            <CommonFooter />
        </main>
        <!-- Loader -->
        <Loader />
        <!-- Flush Notifications -->
        <Toast
            position="top-right"
            group="notices"
        />
    </div>
</template>