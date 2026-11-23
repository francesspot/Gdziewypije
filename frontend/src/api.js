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

// Błędy 422 przypisane do pól, np. { email: '...' }, żeby formularz pokazał je przy właściwym polu
function formatFieldErrors(detail) {
  const fields = {}
  if (!Array.isArray(detail)) {
    return fields
  }
  for (const item of detail) {
    if (item?.loc?.length > 1 && item.msg) {
      fields[item.loc.at(-1)] = item.msg
    }
  }
  return fields
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
    let detail = null
    try {
      const body = await response.json()
      detail = body.detail
    } catch {
      // Odpowiedź bez JSON, zostaje komunikat ze statusem
    }
    const error = new Error(formatDetail(detail) ?? `Błąd serwera (${response.status})`)
    // Status pozwala odróżnić np. 409 (zajęty e-mail) od 401 (złe hasło)
    error.status = response.status
    error.fields = formatFieldErrors(detail)
    throw error
  }

  if (response.status === 204) {
    return null
  }
  return response.json()
}

export function getRanking() {
  return request('/ranking')
}

export function getBars() {
  return request('/bars')
}

export function getTopMonth() {
  return request('/top-month')
}

export function getBar(barId) {
  return request(`/bars/${barId}`)
}

// Rejestracja i logowanie zwracają { access_token, token_type, user }, czyli gotową sesję
export function register(email, password, displayName) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  })
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getMe() {
  return request('/auth/me')
}

// PUT, bo kolejna ocena tej samej osoby zastępuje poprzednią (T4)
export function rateBar(barId, value) {
  return request(`/bars/${barId}/rating`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export function getFavorites() {
  return request('/favorites')
}

export function addFavorite(barId) {
  return request(`/bars/${barId}/favorite`, { method: 'POST' })
}

export function removeFavorite(barId) {
  return request(`/bars/${barId}/favorite`, { method: 'DELETE' })
}

// T2: zwraca zapisaną cenę w tym samym formacie co lista cen baru
export function reportPrice(barId, drinkId, amount) {
  return request(`/bars/${barId}/prices`, {
    method: 'POST',
    body: JSON.stringify({ drink_id: drinkId, amount }),
  })
}

// T3: kind to 'confirm' (cena się zgadza) albo 'change' (cena jest inna), drugie potwierdzenie daje 409
export function confirmPrice(priceId, kind) {
  return request(`/prices/${priceId}/confirmations`, {
    method: 'POST',
    body: JSON.stringify({ kind }),
  })
}
