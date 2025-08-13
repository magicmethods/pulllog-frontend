/**
 * PKCE ヘルパ（S256）
 * - state / code_verifier は sessionStorage に保存
 */

const PKCE_VERIFIER_KEY = 'pkce_verifier'
const PKCE_STATE_KEY = 'pkce_state'

function base64UrlEncode(bytes: Uint8Array): string {
    let str = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        str += String.fromCharCode(bytes[i])
    }
    const b64 = typeof window === 'undefined'
        ? Buffer.from(str, 'binary').toString('base64')
        : btoa(str)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(input: string): Promise<string> {
    const enc = new TextEncoder()
    const data = enc.encode(input)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return base64UrlEncode(new Uint8Array(digest))
}

function randomString(length = 64): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    const chars: string[] = []
    for (let i = 0; i < array.length; i++) {
        chars.push(charset[array[i] % charset.length])
    }
    return chars.join('')
}

export function usePkce() {
    function save(key: string, value: string) {
        if (typeof window === 'undefined') return
        sessionStorage.setItem(key, value)
    }
    function load(key: string): string | null {
        if (typeof window === 'undefined') return null
        return sessionStorage.getItem(key)
    }
    function remove(key: string) {
        if (typeof window === 'undefined') return
        sessionStorage.removeItem(key)
    }

    async function create(): Promise<{ verifier: string, challenge: string, state: string }> {
        const verifier = randomString(64)
        const state = randomString(32)
        const challenge = await sha256(verifier)
        save(PKCE_VERIFIER_KEY, verifier)
        save(PKCE_STATE_KEY, state)
        return { verifier, challenge, state }
    }

    function popVerifier(): string | null {
        const v = load(PKCE_VERIFIER_KEY)
        if (v) remove(PKCE_VERIFIER_KEY)
        return v
    }

    function popState(): string | null {
        const s = load(PKCE_STATE_KEY)
        if (s) remove(PKCE_STATE_KEY)
        return s
    }

    return {
        create,
        popVerifier,
        popState,
    }
}
