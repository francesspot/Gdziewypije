import { useEffect, useState } from 'react'
import { getRanking } from '../api'
import CloseArrow from './CloseArrow'

function formatRating(avgRating) {
  return avgRating == null ? '–' : avgRating.toFixed(1)
}

function ListPanel({ open, favoriteIds, onToggleFavorite, onClose, onSwitchToTop }) {
  const [query, setQuery] = useState('')
  const [bars, setBars] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const normalized = query.trim().toLowerCase()
  const visibleBars = bars.filter((bar) => bar.name.toLowerCase().includes(normalized))

  useEffect(() => {
    let cancelled = false

    // Kolejność i miejsca pochodzą z rankingu w backendzie (Q2), więc lista nie jest sortowana ponownie
    getRanking()
      .then((data) => {
        if (!cancelled) {
          setBars(data)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setBars([])
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <aside
      className={['side-panel', 'side-panel-right', open ? 'is-open' : ''].filter(Boolean).join(' ')}
      aria-label="Lista barów"
      aria-hidden={!open}
      inert={!open}
    >
      <header className="list-header">
        <button
          className="panel-switch-button"
          type="button"
          onClick={onSwitchToTop}
          aria-label="Przejdź do TOP"
        >
          TOP
        </button>
        <h1>Lista</h1>
        <button className="close-button" type="button" onClick={onClose} aria-label="Zamknij listę">
          <CloseArrow direction="right" />
        </button>
      </header>
      <label className="search">
        <span className="sr-only">Wyszukaj</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Wyszukaj"
        />
        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="10.5"
            cy="10.5"
            r="6.2"
            fill="none"
            stroke="var(--ink-oak)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M15.4 15.4 L20 20"
            fill="none"
            stroke="var(--ink-oak)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </label>
      {loading ? (
        <p className="list-status" role="status">
          Ładowanie…
        </p>
      ) : null}
      {error ? (
        <p className="list-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="bar-list">
        {visibleBars.map((bar) => {
          const isFavorite = favoriteIds.includes(bar.id)
          return (
            <li key={bar.id}>
              <span className="bar-rank">{bar.rank}.</span>
              <button
                className={isFavorite ? 'favorite-star is-on' : 'favorite-star'}
                type="button"
                aria-pressed={isFavorite}
                aria-label={
                  isFavorite ? `Usuń ${bar.name} z ulubionych` : `Dodaj ${bar.name} do ulubionych`
                }
                onClick={() => onToggleFavorite(bar.id)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3.2 14.6 8.8 20.8 9.4 16.2 13.6 17.6 19.8 12 16.8 6.4 19.8 7.8 13.6 3.2 9.4 9.4 8.8 Z"
                    stroke="var(--ink-oak)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span className="bar-name">{bar.name}</span>
              <span className="rating">{formatRating(bar.avg_rating)}</span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

export default ListPanel
