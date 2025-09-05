/**
 * 選択範囲のテキストをクリップボードにコピーする
 * @returns コピー成功時はtrue、失敗時はfalse
 */
export async function copySelectedText(): Promise<boolean> {
    const selection = window.getSelection()
    if (!selection || selection.toString() === "") return false
    const text = selection.toString()
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (e) {
        // クリップボードAPI未対応時は従来のexecCommandで対応
        try {
            document.execCommand("copy")
            return true
        } catch (err) {
            return false
        }
    }
}
