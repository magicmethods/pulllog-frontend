import type { Directive } from 'vue'

export const vBlurOnClick: Directive<HTMLElement> = {
    mounted(el: HTMLElement) {
        el.addEventListener('click', () => {
            setTimeout(() => el.blur())
        })
    },
    beforeUnmount(el: HTMLElement) {
        el.removeEventListener('click', () => el.blur())
    }
}
