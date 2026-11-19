import { PLACEHOLDER_BARS } from '../placeholderBars'
import CloseArrow from './CloseArrow'

const CHART_ORDER = [3, 1, 2]

function TopPanel({ onClose }) {
  const chartBars = CHART_ORDER.map((id) => PLACEHOLDER_BARS.find((bar) => bar.id === id))

  return (
    <aside className="side-panel side-panel-left" aria-label="TOP z danego miesiąca">
      <header className="top-header">
        <button className="close-button" type="button" onClick={onClose} aria-label="Zamknij TOP">
          <CloseArrow direction="left" />
        </button>
        <div className="top-divider" />
        <h1>TOP</h1>
      </header>
      <div className="chart">
        {chartBars.map((bar) => (
          <div key={bar.id} className="chart-column">
            <div className="chart-track">
              <span className="chart-label">{bar.name}</span>
              <div className="chart-bar" style={{ height: `${bar.barHeight}%` }} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default TopPanel
