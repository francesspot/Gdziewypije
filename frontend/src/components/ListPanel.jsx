import { useEffect, useState } from 'react'
import { getBars, getRanking } from '../api'
import CloseArrow from './CloseArrow'

function formatRating(avgRating) {
  return avgRating == null ? '–' : avgRating.toFixed(1)
}

function BarListItem({ bar, isFavorite, onToggleFavorite }) {
  return (
    <li>
      {/* Pusta komórka bez miejsca wyrównuje nazwy w obu sekcjach */}
      <span className="bar-rank">{bar.rank == null ? '' : `${bar.rank}.`}</span>
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
}

function ListPanel({ open, favoriteIds, onToggleFavorite, onClose, onSwitchToTop }) {
  const [query, setQuery] = useState('')
  const [rankedBars, setRankedBars] = useState([])
  const [unratedBars, setUnratedBars] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const normalized = query.trim().toLowerCase()
  const matchesQuery = (bar) => bar.name.toLowerCase().includes(normalized)
  const visibleRanked = rankedBars.filter(matchesQuery)
  const visibleUnrated = unratedBars.filter(matchesQuery)

  useEffect(() => {
    let cancelled = false

    // Kolejność i miejsca pochodzą z rankingu w backendzie (Q2), więc lista nie jest sortowana ponownie.
    // Ranking pomija bary bez ocen, więc trafiają do osobnej sekcji z /bars (już posortowane po nazwie).
    Promise.all([getRanking(), getBars()])
      .then(([ranking, allBars]) => {
        if (!cancelled) {
          setRankedBars(ranking)
          setUnratedBars(allBars.filter((bar) => bar.ratings_count === 0))
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRankedBars([])
          setUnratedBars([])
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
      <div className="bar-list">
        <ul className="bar-list-section">
          {visibleRanked.map((bar) => (
            <BarListItem
              key={bar.id}
              bar={bar}
              isFavorite={favoriteIds.includes(bar.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ul>
        {visibleUnrated.length > 0 ? (
          <>
            <h2 className="bar-list-heading">Bez ocen</h2>
            <ul className="bar-list-section">
              {visibleUnrated.map((bar) => (
                <BarListItem
                  key={bar.id}
                  bar={bar}
                  isFavorite={favoriteIds.includes(bar.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </aside>
  )
}

export default ListPanel
