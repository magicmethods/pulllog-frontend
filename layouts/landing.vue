<script setup lang="ts">

// 必要に応じてグローバルCSSやSEO meta設定

</script>

<template>
    <div class="landing-wrapper min-h-screen flex flex-col bg-gradient-to-b from-purple-50 to-white">
        <!-- ヘッダー -->
        <header class="landing-header flex items-center justify-between p-4 border-b border-gray-400 bg-transparent">
            <NuxtLink to="/" class="text-2xl font-bold flex items-center gap-2">
                <img src="/images/pulllog-icon.svg" alt="PullLog" class="h-8 w-8" />
                <span class="tracking-tight">PullLog</span>
            </NuxtLink>
            <nav class="flex m-0 p-0 items-center gap-4">
                <NuxtLink to="/auth/register" class="landing-login-btn px-5 py-2 rounded-lg border border-primary-400 text-primary-700 font-semibold hover:bg-primary-100 transition">
                    新規登録
                </NuxtLink>
                <NuxtLink to="/auth/login" class="landing-login-btn px-5 py-2 rounded-lg border border-primary-400 text-primary-700 font-semibold hover:bg-primary-100 transition">
                    ログイン
                </NuxtLink>
            </nav>
        </header>

        <!-- メインコンテンツ -->
        <main class="flex-1 flex flex-col items-center justify-center p-4">
            <slot />
        </main>

        <!-- フッター -->
        <footer class="landing-footer text-center py-8 text-gray-400 text-xs">
            &copy; {{ new Date().getFullYear() }} PullLog. All rights reserved.
        </footer>
    </div>
</template>

<style lang="scss" scoped>
.landing-wrapper {
    font-family: 'Nunito', 'M PLUS Rounded 1c', sans-serif;
    background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
}
.landing-header {
    box-shadow: none;
}
.landing-login-btn {
    border-width: 2px;
}
.landing-footer {
    letter-spacing: 0.02em;
}
</style>
