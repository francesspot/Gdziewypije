import { useEffect, useState } from 'react'
import { clearSession, getMe, getSession, setSession } from './api'
import AccountPanel from './components/AccountPanel'
import AdminPanel from './components/AdminPanel'
import ListPanel from './components/ListPanel'
import MapScreen from './components/MapScreen'
import TopPanel from './components/TopPanel'
import './App.css'

function App() {
  const [topOpen, setTopOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [accountOpen, setAccountOpen] = useState(false)
  // Sesja z localStorage, żeby po odświeżeniu strony użytkownik był dalej zalogowany
  const [user, setUser] = useState(() => getSession()?.user ?? null)
  const [adminOpen, setAdminOpen] = useState(false)
  // Rola jest sprawdzana też w backendzie (403), tutaj decyduje tylko o pokazaniu panelu
  const isAdmin = user?.role === 'admin'
  // Licznik zmian z panelu administratora; mapa i lista pobierają bary od nowa, gdy się zwiększy
  const [barsVersion, setBarsVersion] = useState(0)

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

  function handleLoggedIn(session) {
    setSession(session)
    setUser(session.user)
    setAccountOpen(false)
  }

  function handleLogout() {
    clearSession()
    setUser(null)
    setAccountOpen(false)
    setAdminOpen(false)
  }

  function openAdmin() {
    setAccountOpen(false)
    setAdminOpen(true)
  }

  function toggleFavorite(barId) {
    setFavoriteIds((current) =>
      current.includes(barId) ? current.filter((id) => id !== barId) : [...current, barId],
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
        barsVersion={barsVersion}
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
        barsVersion={barsVersion}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
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
        onOpenAdmin={openAdmin}
      />
      <AdminPanel
        open={adminOpen && isAdmin}
        onClose={() => setAdminOpen(false)}
        onChanged={() => setBarsVersion((version) => version + 1)}
      />
    </div>
  )
}

export default App
