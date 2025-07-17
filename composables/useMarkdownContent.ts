import { useAsyncData } from 'nuxt/app'
import { marked } from 'marked'

export async function useMarkdownContent(path: string) {
    const { data } = await useAsyncData(path, async () => {
        // public配下か、サーバAPI経由かで取得方式を切り替え
        const src = path.startsWith('http') ? path : `/content/${path}`
        try {
            const res = await fetch(src)
            console.log('Fetching markdown content from:', src, res)
            if (!res.ok) return ''
            const md = await res.text()
            return marked.parse(md)
        } catch (error) {
            console.error('Error fetching markdown content:', error)
            return ''
        }
    })
    return data.value || ''
}
