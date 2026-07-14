import axios from 'axios'

export type ApiErrorPayload =
  | string
  | {
      message?: string
      error?: string
      [key: string]: unknown
    }

export class ApiRequestError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.payload = payload
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const message = record.message ?? record.error

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

const http = axios.create({
  withCredentials: true,
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      window.dispatchEvent(new CustomEvent('app:unauthorized'))
    }
    if (status === 403) {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: {
            type: 'error',
            message: 'Cảnh báo bảo mật: Bạn không có quyền thực hiện chức năng này!',
          },
        }),
      )
    }
    return Promise.reject(error)
  },
)

export async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()

  const headers = new Headers(init?.headers)
  const hasBody = init?.body !== undefined

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const headerRecord: Record<string, string> = {}
  headers.forEach((value, key) => {
    headerRecord[key] = value
  })

  try {
    const response = await http.request({
      url: path,
      method,
      data: init?.body,
      headers: headerRecord,
    })
    return response.data as T
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status
      const payload = error.response.data
      throw new ApiRequestError(getErrorMessage(payload, `Yêu cầu thất bại (${status})`), status, payload)
    }
    throw error
  }
}
