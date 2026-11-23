import { useEffect, useState } from 'react'
import {
  addFavorite,
  clearSession,
  getFavorites,
  getMe,
  getSession,
  removeFavorite,
  setSession,
} from './api'
import AccountPanel from './components/AccountPanel'
import ListPanel from './components/ListPanel'
import MapScreen from './components/MapScreen'
import TopPanel from './components/TopPanel'
import './App.css'

function App() {
  const [topOpen, setTopOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState([])
  // Stan w App, bo okienko baru otwiera zarówno marker na mapie, jak i pozycja na liście.
  const [selectedBarId, setSelectedBarId] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)
  // Sesja z localStorage, żeby po odświeżeniu strony użytkownik był dalej zalogowany
  const [user, setUser] = useState(() => getSession()?.user ?? null)
  const [favoriteError, setFavoriteError] = useState('')
  // Samo id w zależnościach, bo odświeżenie danych konta (getMe) daje nowy obiekt tego samego użytkownika
  const userId = user?.id ?? null

  useEffect(() => {
    // Token mógł wygasnąć albo konto zostało wyłączone, więc zapisana sesja jest sprawdzana w backendzie
    const session = getSession()
    if (!session) {
      return
    }
    let cancelled = false

    getMe()
      .then((me) => {
        if (!cancelled) {
          setSession({ ...session, user: me })
          setUser(me)
        }
      })
      .catch((err) => {
        // Tylko 401 oznacza nieważny token; brak połączenia z serwerem nie wylogowuje.
        // Porównanie tokenu chroni sesję, gdy użytkownik zalogował się ponownie przed odpowiedzią.
        if (
          !cancelled &&
          err.status === 401 &&
          getSession()?.access_token === session.access_token
        ) {
          clearSession()
          setUser(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (userId == null) {
      return
    }
    let cancelled = false

    getFavorites()
      .then((favorites) => {
        if (!cancelled) {
          setFavoriteIds(favorites.map((favorite) => favorite.bar_id))
        }
      })
      .catch((err) => {
        // 401 obsługuje sprawdzenie sesji przy starcie, więc nie jest pokazywany drugi raz
        if (!cancelled && err.status !== 401) {
          setFavoriteError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!favoriteError) {
      return
    }
    const timer = setTimeout(() => setFavoriteError(''), 4000)
    return () => clearTimeout(timer)
  }, [favoriteError])

  function handleLoggedIn(session) {
    setSession(session)
    setUser(session.user)
    setAccountOpen(false)
  }

  function handleLogout() {
    clearSession()
    setUser(null)
    setFavoriteIds([])
    setAccountOpen(false)
  }

  // Wygasły token w trakcie pracy: wylogowanie i okno logowania zamiast samego komunikatu
  function handleUnauthorized() {
    clearSession()
    setUser(null)
    setFavoriteIds([])
    setAccountOpen(true)
  }

  async function toggleFavorite(barId) {
    // Ulubione ma tylko zalogowany użytkownik (WB.08), więc gość trafia do logowania
    if (!user) {
      setAccountOpen(true)
      return
    }
    const isFavorite = favoriteIds.includes(barId)
    try {
      if (isFavorite) {
        await removeFavorite(barId)
      } else {
        await addFavorite(barId)
      }
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      // 409 przy dodaniu i 404 przy usunięciu oznaczają, że backend ma już docelowy stan (np. zmiana w innej karcie)
      const alreadyDone = isFavorite ? err.status === 404 : err.status === 409
      if (!alreadyDone) {
        setFavoriteError(err.message)
        return
      }
    }
    setFavoriteError('')
    setFavoriteIds((current) =>
      isFavorite ? current.filter((id) => id !== barId) : [...current, barId],
    )
  }

  return (
    <div
      className={[
        'app',
        topOpen ? 'app-top-open' : '',
        listOpen ? 'app-list-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg className="sketch-filter" aria-hidden="true">
        <filter id="sketch">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.1" />
        </filter>
      </svg>
      <MapScreen
        topOpen={topOpen}
        listOpen={listOpen}
        selectedBarId={selectedBarId}
        onSelectBar={setSelectedBarId}
        onOpenTop={() => setTopOpen(true)}
        onOpenList={() => setListOpen(true)}
      />
      {!accountOpen ? (
        <button
          className="account-button"
          type="button"
          onClick={() => setAccountOpen(true)}
          aria-label={user ? `Konto: ${user.display_name}` : 'Zaloguj się'}
        >
          {user ? user.display_name : 'Zaloguj'}
        </button>
      ) : null}
      {favoriteError ? (
        <p className="favorite-error" role="alert">
          {favoriteError}
        </p>
      ) : null}
      <TopPanel
        open={topOpen}
        onClose={() => setTopOpen(false)}
        onSwitchToList={() => {
          setTopOpen(false)
          setListOpen(true)
        }}
      />
      <ListPanel
        open={listOpen}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
        onSelectBar={setSelectedBarId}
        onClose={() => setListOpen(false)}
        onSwitchToTop={() => {
          setListOpen(false)
          setTopOpen(true)
        }}
      />
      <AccountPanel
        open={accountOpen}
        user={user}
        onClose={() => setAccountOpen(false)}
        onLoggedIn={handleLoggedIn}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default App
