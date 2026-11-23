import { useEffect, useState } from 'react'
import { getBars, getRanking } from '../api'
import CloseArrow from './CloseArrow'
import FavoriteStar from './FavoriteStar'

function formatRating(avgRating) {
  return avgRating == null ? '–' : avgRating.toFixed(1)
}

function BarListItem({ bar, isFavorite, onToggleFavorite, onSelectBar }) {
  return (
    <li>
      {/* Pusta komórka bez miejsca wyrównuje nazwy w obu sekcjach */}
      <span className="bar-rank">{bar.rank == null ? '' : `${bar.rank}.`}</span>
      <FavoriteStar
        barName={bar.name}
        isFavorite={isFavorite}
        onToggle={() => onToggleFavorite(bar.id)}
      />
      <button className="bar-name" type="button" onClick={() => onSelectBar(bar.id)}>
        {bar.name}
      </button>
      <span className="rating">{formatRating(bar.avg_rating)}</span>
    </li>
  )
}

function ListPanel({ open, favoriteIds, onToggleFavorite, onSelectBar, onClose, onSwitchToTop }) {
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('best')
  const [rankedBars, setRankedBars] = useState([])
  const [unratedBars, setUnratedBars] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const normalized = query.trim().toLowerCase()
  const matchesQuery = (bar) => bar.name.toLowerCase().includes(normalized)
  const filteredRanked = rankedBars.filter(matchesQuery)
  // Od najgorszych to odwrócony ranking z backendu, więc miejsca przy barach się nie zmieniają.
  const visibleRanked = sortOrder === 'worst' ? [...filteredRanked].reverse() : filteredRanked
  const visibleUnrated = unratedBars.filter(matchesQuery)
  const isEmpty = !loading && !error && visibleRanked.length === 0 && visibleUnrated.length === 0

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
      <div className="list-sort" role="group" aria-label="Kolejność rankingu">
        <button
          type="button"
          aria-pressed={sortOrder === 'best'}
          onClick={() => setSortOrder('best')}
        >
          Najlepsze
        </button>
        <button
          type="button"
          aria-pressed={sortOrder === 'worst'}
          onClick={() => setSortOrder('worst')}
        >
          Najgorsze
        </button>
      </div>
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
      {isEmpty ? (
        <p className="list-status" role="status">
          {normalized ? 'Brak barów o takiej nazwie' : 'Brak barów'}
        </p>
      ) : null}
      <div className="bar-list">
        {/* Filtr zachowuje kolejność i miejsca z rankingu, bo nie zmienia kolejności elementów */}
        {visibleRanked.length > 0 ? (
          <ul className="bar-list-section">
            {visibleRanked.map((bar) => (
              <BarListItem
                key={bar.id}
                bar={bar}
                isFavorite={favoriteIds.includes(bar.id)}
                onToggleFavorite={onToggleFavorite}
                onSelectBar={onSelectBar}
              />
            ))}
          </ul>
        ) : null}
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
                  onSelectBar={onSelectBar}
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
