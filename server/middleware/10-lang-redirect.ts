import { defineEventHandler, getRequestURL, sendRedirect, setCookie } from "h3"

export default defineEventHandler((event) => {
    const url = getRequestURL(event)
    const m = url.pathname.match(/^\/(ja|en|zh)\/?$/)
    if (!m) return

    const target = m[1]
    setCookie(event, "pulllog-lang", target, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 365, // 1年
    })

    return sendRedirect(event, "/", 302)
})
