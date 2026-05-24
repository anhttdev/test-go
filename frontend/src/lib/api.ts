export type ApiErrorPayload =
  | string
  | {
      message?: string
      error?: string
      [key: string]: unknown
    }

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text || null
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

export async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const hasBody = init?.body !== undefined

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers,
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Yêu cầu thất bại (${response.status})`))
  }

  return payload as T
}

