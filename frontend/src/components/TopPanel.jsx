import { useEffect, useState } from 'react'
import { getTopMonth } from '../api'
import BeerStackColumn from './BeerStackColumn'
import CloseArrow from './CloseArrow'
import { buildTopPodium } from '../topPodium'

function TopPanel({ open, barsVersion, onClose, onSwitchToList }) {
  const [bars, setBars] = useState([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const podium = buildTopPodium(bars)

  useEffect(() => {
    let cancelled = false

    getTopMonth()
      .then((data) => {
        if (!cancelled) {
          setBars(data)
          setError('')
          setLoaded(true)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setBars([])
          setError(err.message)
          setLoaded(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [barsVersion])

  return (
    <aside
      className={['side-panel', 'side-panel-left', open ? 'is-open' : ''].filter(Boolean).join(' ')}
      aria-label="TOP z danego miesiąca"
      aria-hidden={!open}
      inert={!open}
    >
      <header className="top-header">
        <div className="panel-nav-row">
          <button className="close-button" type="button" onClick={onClose} aria-label="Zamknij TOP">
            <CloseArrow direction="left" />
          </button>
          <button
            className="panel-switch-button"
            type="button"
            onClick={onSwitchToList}
            aria-label="Przejdź do listy"
          >
            Lista
          </button>
        </div>
        <div className="top-divider" />
        <h1>TOP</h1>
      </header>
      {error ? (
        <p className="list-error" role="alert">
          {error}
        </p>
      ) : null}
      {!error && loaded && podium.length === 0 ? (
        <p className="top-empty">Brak barów w tym miesiącu</p>
      ) : null}
      {!error && podium.length > 0 ? (
        <div className="beer-stacks">
          {podium.map(({ bar, mugCount }) => (
            <BeerStackColumn key={bar.bar_id} bar={bar} mugCount={mugCount} />
          ))}
        </div>
      ) : null}
    </aside>
  )
}

export default TopPanel
