import { useState } from 'react'
import { getSession } from './api'
import AccountPanel from './components/AccountPanel'
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
  const [user] = useState(() => getSession()?.user ?? null)

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
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
        onClose={() => setListOpen(false)}
        onSwitchToTop={() => {
          setListOpen(false)
          setTopOpen(true)
        }}
      />
      <AccountPanel open={accountOpen} user={user} onClose={() => setAccountOpen(false)} />
    </div>
  )
}

export default App
