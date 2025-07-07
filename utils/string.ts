/**
 * 文字列をバイト単位でトリミングする関数（レンダリング前でも疑似的に計算可能）
 * @param str - 対象の文字列
 * @param baseSize - 1バイトあたりのピクセル値（例: 1rem = 14px ならば 7px）
 * @param maxWidth - 最大幅（ピクセル値）
 * @param ellipsis - 省略記号（デフォルトは '...'）
 * @return - トリミングされた文字列
 */
export function strBytesTruncate(
    str: string,
    baseSize: number,
    maxWidth: number,
    ellipsis = '...'
): string {
    // 文字列を先頭からシングルバイト*baseSizeとマルチバイト*baseSize*2で計算してmaxWidthを超えないようにトリミング
    let byteSize = 0
    let truncated = ''
    for (let i = 0; i < str.length; i++) {
        const char = str[i]
        const charSize = char.length === 1 ? baseSize : baseSize * 2
        if (byteSize + charSize > maxWidth) {
            truncated += ellipsis
            break
        }
        byteSize += charSize
        truncated += char
    }
    return truncated
}
    
/**
 * 文字列から絵文字を削除する関数
 * @param str - 対象の文字列
 * @return 絵文字を削除した文字列
 */
export function stripEmoji(str: string): string {
    const regex = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g
    return str.replace(regex, '')
}
