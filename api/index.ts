/**
 * API各種呼び出しラッパーメソッド（サービスレイヤー用）
 * ※ 現在未使用
 * @module api
 * @usage
 * ```ts
 * import { getApps, getAppDetail, updateApp } from '~/api'
 * ```
 */
import { useAPI } from '~/composables/useAPI'
import { endpoints } from './endpoints'

export const getApps = () =>
    useAPI().callApi<AppData[]>({ endpoint: endpoints.apps.list(), method: 'GET' })

export const getAppDetail = (id: string) =>
    useAPI().callApi<AppData>({ endpoint: endpoints.apps.detail(id), method: 'GET' })

export const updateApp = (id: string, data: Partial<AppData>) =>
    useAPI().callApi<AppData>({ endpoint: endpoints.apps.update(id), method: 'PUT', data })

// ...他のAPIも同様に記述
