import { useEffect, useState } from 'react'
import { getBar } from '../api'

function formatRating(avgRating) {
  return avgRating == null ? 'brak ocen' : avgRating.toFixed(1)
}

// Komponent dostaje key={barId}, więc wybór innego baru montuje go od nowa ze stanem ładowania.
function BarPopup({ barId, onClose }) {
  const [bar, setBar] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Dane z GET /bars/{id}, a nie z listy na mapie, żeby okienko pokazywało aktualny stan z backendu (WF.02).
    getBar(barId)
      .then((data) => {
        if (!cancelled) {
          setBar(data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
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
  }, [barId])

  return (
    <section className="bar-popup" aria-label={bar ? `Bar ${bar.name}` : 'Szczegóły baru'}>
      <header className="bar-popup-header">
        <h2>{bar ? bar.name : 'Bar'}</h2>
        <button className="bar-popup-close" type="button" onClick={onClose} aria-label="Zamknij okienko baru">
          ×
        </button>
      </header>
      {loading ? (
        <p className="bar-popup-status" role="status">
          Ładowanie…
        </p>
      ) : null}
      {error ? (
        <p className="bar-popup-error" role="alert">
          {error}
        </p>
      ) : null}
      {bar ? (
        <p className="bar-popup-rating">
          <span className="bar-popup-rating-value">Ocena: {formatRating(bar.avg_rating)}</span>
          <span className="bar-popup-rating-count">liczba ocen: {bar.ratings_count}</span>
        </p>
      ) : null}
    </section>
  )
}

export default BarPopup
