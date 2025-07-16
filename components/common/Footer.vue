<script setup lang="ts">

const appConfig = useConfig()

// Local variables
const appName = appConfig.appName
const appVersion = appConfig.appVersion
const appAuthor = 'MAGIC METHODS'//appConfig.appAuthor
const appInfo = `${appName} v${appVersion}`
const copyright = `${new Date().getFullYear()} ${appAuthor} All rights reserved.`

</script>

<template>
    <footer>
        <div class="flex items-center gap-1.5">
            {{ appInfo }}
            <span class="text-muted select-none">|</span>
            <span>&copy;</span>
            {{ copyright }}
        </div>
    </footer>
</template>