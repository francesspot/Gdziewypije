const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const SESSION_KEY = 'gdziewypije.session'

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function formatValidationItem(item) {
  if (typeof item === 'string') {
    return item
  }
  if (!item?.msg) {
    return null
  }
  // loc z FastAPI to np. ['body', 'email']; ostatni element to nazwa pola, samo ['body'] jej nie ma
  const field = item.loc?.length > 1 ? item.loc.at(-1) : null
  return field ? `${field}: ${item.msg}` : item.msg
}

function formatDetail(detail) {
  if (typeof detail === 'string' && detail) {
    return detail
  }
  if (Array.isArray(detail)) {
    const messages = detail.map(formatValidationItem).filter(Boolean)
    if (messages.length > 0) {
      return messages.join('; ')
    }
  }
  return null
}

export async function request(path, options = {}) {
  const { headers, ...rest } = options
  const session = getSession()
  const requestHeaders = { ...headers }

  if (session?.access_token) {
    requestHeaders.Authorization = `Bearer ${session.access_token}`
  }
  if (rest.body != null && requestHeaders['Content-Type'] == null) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
    })
  } catch {
    throw new Error('Nie udało się połączyć z serwerem')
  }

  if (!response.ok) {
    let message = `Błąd serwera (${response.status})`
    try {
      const body = await response.json()
      const fromDetail = formatDetail(body.detail)
      if (fromDetail) {
        message = fromDetail
      }
    } catch {
      // Odpowiedź bez JSON, zostaje komunikat ze statusem
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }
  return response.json()
}

export function getBars() {
  return request('/bars')
}
