import BeerStackColumn from './BeerStackColumn'
import CloseArrow from './CloseArrow'
import { buildTopPodium } from '../topPodium'

function TopPanel({ open, onClose, onSwitchToList }) {
  const podium = buildTopPodium()

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
      <div className="beer-stacks">
        {podium.map(({ bar, mugCount }) => (
          <BeerStackColumn key={bar.id} bar={bar} mugCount={mugCount} />
        ))}
      </div>
    </aside>
  )
}

export default TopPanel