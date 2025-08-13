export const ERROR_URL = {
    BadRequest: '/error/400',
    Unauthorized: '/error/401',
    Forbidden: '/error/403',
    NotFound: '/error/404',
    InternalServerError: '/error/500',
}

export class ApiError extends Error {
    status: number
    data?: unknown
    constructor(message: string, status: number, data?: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }
}
