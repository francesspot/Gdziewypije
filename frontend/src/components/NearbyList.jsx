import { formatDistanceMeters } from '../geoDistance'
import CloseArrow from './CloseArrow'

function NearbyList({ open, bars, onSelectBar, onClose }) {
  if (!open) {
    return null
  }

  return (
    <aside
      className="nearby-panel"
      aria-label="Bary w pobliżu"
      aria-live="polite"
    >
      <header className="nearby-header">
        <h2 className="nearby-title">W pobliżu</h2>
        <button className="close-button" type="button" onClick={onClose} aria-label="Zamknij listę w pobliżu">
          <CloseArrow direction="right" />
        </button>
      </header>
      {bars.length === 0 ? (
        <p className="nearby-empty">Brak barów w pobliżu</p>
      ) : (
        <ul className="nearby-list">
          {bars.map((bar) => (
            <li key={bar.id} className="nearby-row">
              <button className="nearby-name" type="button" onClick={() => onSelectBar(bar.id)}>
                {bar.name}
              </button>
              <span className="nearby-distance">{formatDistanceMeters(bar.distance_m)}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export default NearbyList
