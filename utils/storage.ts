/**
 * localStorage と sessionStorage への処理を管理するWEBストレージ用ユーティリティクラス
 */
export class StorageUtil {
    private storage: Storage

    constructor(storageType: 'local' | 'session' = 'local') {
        if (typeof window !== 'undefined' && window[`${storageType}Storage`]) {
            this.storage = storageType === 'local' ? window.localStorage : window.sessionStorage
        } else {
            throw new Error(`${storageType}Storage is not available`)
        }
    }

    getItem<T = unknown>(key: string): T | null {
        const JSONString = this.storage.getItem(key)
        if (JSONString === null) {
            return null
        }
        return JSON.parse(JSONString).value as T
    }

    setItem(key: string, value: unknown): void {
        const data = { value }
        this.storage.setItem(key, JSON.stringify(data))
    }

    removeItem(key: string): void {
        this.storage.removeItem(key)
    }
}
