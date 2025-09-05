/**
 * localStorage と sessionStorage への処理を管理するWEBストレージ用ユーティリティクラス
 */
export class StorageUtil {
    private storage: Storage

    constructor(storageType: "local" | "session" = "local") {
        if (typeof window !== "undefined" && window[`${storageType}Storage`]) {
            this.storage =
                storageType === "local"
                    ? window.localStorage
                    : window.sessionStorage
        } else {
            throw new Error(`${storageType}Storage is not available`)
        }
    }

    getItem<T = unknown>(key: string): T | null {
        const item = this.storage.getItem(key)
        if (item === null) return null
        try {
            return JSON.parse(item).value as T
        } catch {
            return item as unknown as T
        }
    }

    setItem(key: string, value: unknown): void {
        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            value === null
        ) {
            this.storage.setItem(key, String(value))
        } else {
            this.storage.setItem(key, JSON.stringify(value))
        }
    }

    removeItem(key: string): void {
        this.storage.removeItem(key)
    }
}
