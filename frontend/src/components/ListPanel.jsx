import { useState } from 'react'
import { PLACEHOLDER_BARS } from '../placeholderBars'
import CloseArrow from './CloseArrow'

function ListPanel({ favoriteIds, onToggleFavorite, onClose }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const visibleBars = PLACEHOLDER_BARS.filter((bar) =>
    bar.name.toLowerCase().includes(normalized),
  )

  return (
    <aside className="side-panel side-panel-right" aria-label="Lista barów">
      <header className="list-header">
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
            stroke="#1a1a1a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M15.4 15.4 L20 20"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </label>
      <ul className="bar-list">
        {visibleBars.map((bar) => {
          const isFavorite = favoriteIds.includes(bar.id)
          return (
            <li key={bar.id}>
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
                    stroke="#1a1a1a"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span className="bar-name">{bar.name}</span>
              <span className="rating">{bar.rating.toFixed(1)}</span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

export default ListPanel
