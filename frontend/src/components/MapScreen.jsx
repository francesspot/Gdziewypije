import { PLACEHOLDER_BARS } from '../placeholderBars'

const PIN_POSITIONS = {
  1: { top: '58%', left: '54%' },
  2: { top: '44%', left: '40%' },
  3: { top: '68%', left: '48%' },
}

function MapScreen({ topOpen, listOpen, favoriteIds, onOpenTop, onOpenList }) {
  return (
    <section className="map-screen" aria-label="Mapa">
      <p className="map-placeholder">Mapa</p>
      {!topOpen ? (
        <button className="edge-button edge-button-left" type="button" onClick={onOpenTop}>
          TOP
        </button>
      ) : null}
      {!listOpen ? (
        <button className="edge-button edge-button-right" type="button" onClick={onOpenList}>
          Lista
        </button>
      ) : null}
      {PLACEHOLDER_BARS.filter((bar) => favoriteIds.includes(bar.id)).map((bar) => (
        <div
          key={bar.id}
          className="map-pin"
          style={PIN_POSITIONS[bar.id]}
          title={bar.name}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.2 14.6 8.8 20.8 9.4 16.2 13.6 17.6 19.8 12 16.8 6.4 19.8 7.8 13.6 3.2 9.4 9.4 8.8 Z"
              fill="#facc15"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ))}
      <div className="map-controls" aria-label="Kontrolki mapy">
        <button type="button" aria-label="Przybliż">
          +
        </button>
        <button type="button" aria-label="Oddal">
          −
        </button>
        <button className="map-locate" type="button" aria-label="Moja lokalizacja">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
            <path
              d="M12 3.5 V7.2 M12 16.8 V20.5 M3.5 12 H7.2 M16.8 12 H20.5"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </section>
  )
}

export default MapScreen
