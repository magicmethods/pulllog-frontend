// biome-ignore lint/suspicious/noExplicitAny: This is a utility function intended to accept arbitrary argument types
type Arguments = any[]

/**
 * Restrict a function to be executed only once within a certain time interval
 * @param {Function} func - The function to throttle
 * @param {number} delay - The time interval in milliseconds
 * @returns 
 */
export function throttle<T extends (...args: Arguments) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let lastCall = 0

    return (...args: Parameters<T>) => {
        const now = Date.now()
        if (now - lastCall >= delay) {
            lastCall = now
            func(...args)
        }
    }
}

/**
 * Delays a function call for a certain amount of time, and resets the delay if a new call occurs during that time
 * @param {Function} func - The function to debounce 
 * @param {number} delay - The time interval in milliseconds 
 * @returns 
 */
export function debounce<T extends (...args: Arguments) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(() => {
            func(...args)
        }, delay)
    }
}
