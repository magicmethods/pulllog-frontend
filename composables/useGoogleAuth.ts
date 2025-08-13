import { usePkce } from '~/composables/usePkce'

// Types
type StartOptions = {
    redirectUri: string
    remember?: boolean
}

export function useGoogleAuth() {
    const { create } = usePkce()

    async function start(options: StartOptions) {
        const clientId = useRuntimeConfig().public.googleClientId
        const redirectUri = options.redirectUri
        const remember = options.remember === undefined ? true : options.remember

        const { challenge, state } = await create()

        const params = new URLSearchParams()
        params.set('client_id', clientId)
        params.set('redirect_uri', redirectUri)
        params.set('response_type', 'code')
        params.set('scope', 'openid email profile')
        params.set('code_challenge', challenge)
        params.set('code_challenge_method', 'S256')
        params.set('state', JSON.stringify({ s: state, r: remember ? 1 : 0 }))

        // Googleのauthorizeへ
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    }

    return { start }
}
