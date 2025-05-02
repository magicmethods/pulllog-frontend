<script setup lang="ts">

// Local variables
const copyright = '© 2025 MAGIC METHODS'
const footerClass = {
    root: 'flex items-center justify-center w-full h-12 bg-surface-50 dark:bg-surface-800 border-t border-surface-400 dark:border-surface-700',
    text: 'text-xs text-surface-500 dark:text-surface-600',
}

</script>

<template>
    <footer :class="footerClass.root">
        <div :class="footerClass.text">{{ copyright }}</div>
    </footer>
</template>