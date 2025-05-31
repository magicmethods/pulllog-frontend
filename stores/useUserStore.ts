export const useUserStore = defineStore('user', () => {
    // state
    const user = ref<User | null>(null)
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)

    // actions
    function setUser(userData: User) {
        user.value = userData
    }

    function setDummyUser(partialUserData?: Partial<User>) {
        const baseDummyUser = {
            id: 1,
            name: 'Ling Xiaoyu',
            email: 'ling-xiaoyu@dev.pulllog.net',
            avatar_url: null,
            //roles: ['user'],
            //plan: 'free',
            //plan_expiration: '2025-06-30',
            language: 'ja',
            theme: 'light',
            created_at: '2025-05-02T01:23:45',
            updated_at: '2025-05-02T01:23:45',
            last_login: '2025-05-10T04:56:12',
            //last_login_ip: '192.168.0.1',
            //last_login_user_agent: 'dummy-user-agent',
            is_deleted: false,
            is_verified: true,
            unread_notifications: [],
        }
        const dummyUser = { ...baseDummyUser, ...partialUserData } as User
        setUser(dummyUser)
    }

    function clearUser() {
        user.value = null
    }

    // ログイン状態判定（getterとして使える）
    const isAuthenticated = computed(() => !!user.value)

    // Methods
    async function login(userid: string, password: string) {
        isLoading.value = true
        error.value = null

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userid, password }),
            })

            if (!response.ok) {
                throw new Error('Login failed')
            }

            const data = await response.json()
            setUser(data.user)
        } catch (err) {
            error.value = (err as Error).message
        } finally {
            isLoading.value = false
        }
    }
    function logout() {
        clearUser()
    }

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        setUser,
        setDummyUser,
        clearUser,
        login,
        logout,
    }
})
