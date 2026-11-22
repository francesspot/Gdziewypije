import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { getBars } from '../api'

const WROCLAW_CENTER = [51.11, 17.04]
const INITIAL_ZOOM = 13

// Vite nie serwuje domyślnych ścieżek ikon Leaflet.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const BAR_MARKER_ICON_HEIGHT = 34
const BAR_MARKER_ICON_WIDTH_RATING = 72
const BAR_MARKER_ICON_WIDTH_PRICE = 108
const BAR_MARKER_ICON_WIDTH_NO_DATA = 128

const BAR_MARKER_STAR_SVG =
  '<svg class="bar-marker-star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>'

const BAR_MARKER_DOLLAR_SVG =
  '<svg class="bar-marker-dollar-icon" viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="18" text-anchor="middle" font-size="18" font-family="Inter, sans-serif" font-weight="700" fill="currentColor">$</text></svg>'

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMarkerRating(avgRating) {
  return avgRating == null ? '–' : avgRating.toFixed(1)
}

function cheapestPriceAmount(prices) {
  if (!prices || prices.length === 0) {
    return null
  }
  let min = prices[0].amount
  for (let i = 1; i < prices.length; i += 1) {
    if (prices[i].amount < min) {
      min = prices[i].amount
    }
  }
  return min
}

function formatMarkerPriceLabel(prices) {
  const amount = cheapestPriceAmount(prices)
  if (amount == null) {
    return 'brak danych'
  }
  return `${amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`
}

function createBarMarkerIcon(mode, bar) {
  let leadingSvg
  let labelText
  let iconWidth

  if (mode === 'rating') {
    leadingSvg = BAR_MARKER_STAR_SVG
    labelText = escapeHtml(formatMarkerRating(bar.avg_rating))
    iconWidth = BAR_MARKER_ICON_WIDTH_RATING
  } else {
    leadingSvg = BAR_MARKER_DOLLAR_SVG
    const rawLabel = formatMarkerPriceLabel(bar.prices)
    labelText = escapeHtml(rawLabel)
    iconWidth = rawLabel === 'brak danych' ? BAR_MARKER_ICON_WIDTH_NO_DATA : BAR_MARKER_ICON_WIDTH_PRICE
  }

  // alt działa w Leaflet tylko dla ikon <img>, więc nazwę dla czytnika ekranu niesie ukryty tekst.
  const nameText = `<span class="sr-only">${escapeHtml(bar.name)}: </span>`
  const html = `<div class="bar-marker-pill">${nameText}${leadingSvg}<span class="bar-marker-value">${labelText}</span></div>`
  return L.divIcon({
    className: 'bar-marker',
    html,
    iconSize: [iconWidth, BAR_MARKER_ICON_HEIGHT],
    // Kotwica na czubku strzałki pod pigułką.
    iconAnchor: [iconWidth / 2, BAR_MARKER_ICON_HEIGHT],
  })
}

function MapScreen({ topOpen, listOpen, onOpenTop, onOpenList }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const userMovedMapRef = useRef(false)
  const barsRef = useRef([])
  const fitBoundsDoneRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [bars, setBars] = useState([])
  const [mode, setMode] = useState('rating')
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    const map = L.map(mapContainerRef.current, {
      center: WROCLAW_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: false,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Prawy dolny róg zajmują kontrolki i panel listy, a źródło danych ma być widoczne (WNF.09).
    map.attributionControl.setPosition('bottomleft')

    // Przesunięcie albo zoom przed odpowiedzią API blokuje późniejsze fitBounds.
    map.on('dragstart zoomstart', () => {
      userMovedMapRef.current = true
    })

    mapRef.current = map
    setMapReady(true)

    return () => {
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getBars()
      .then((fetchedBars) => {
        if (cancelled) {
          return
        }
        setFetchError('')
        barsRef.current = fetchedBars
        setBars(fetchedBars)
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!mapReady) {
      return
    }
    const map = mapRef.current
    if (!map) {
      return
    }

    const previousLayer = markersLayerRef.current
    if (previousLayer) {
      map.removeLayer(previousLayer)
    }

    const layer = L.layerGroup()
    const boundsPoints = []

    for (const bar of bars) {
      const point = [bar.latitude, bar.longitude]
      // title daje podpowiedź po najechaniu.
      L.marker(point, { icon: createBarMarkerIcon(mode, bar), title: bar.name }).addTo(layer)
      boundsPoints.push(point)
    }

    layer.addTo(map)
    markersLayerRef.current = layer

    // Tylko przy pierwszym zestawie punktów — zmiana trybu nie przesuwa widoku.
    if (!fitBoundsDoneRef.current && boundsPoints.length > 0 && !userMovedMapRef.current) {
      // maxZoom ogranicza przybliżenie, gdy jest tylko jeden bar.
      map.fitBounds(boundsPoints, { padding: [40, 40], maxZoom: 16 })
      fitBoundsDoneRef.current = true
    }

    return () => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
      if (markersLayerRef.current === layer) {
        markersLayerRef.current = null
      }
    }
  }, [bars, mode, mapReady])

  return (
    <section className="map-screen" aria-label="Mapa">
      {fetchError ? (
        <p className="map-fetch-error" role="alert">
          {fetchError}
        </p>
      ) : null}
      <div className="map-canvas" ref={mapContainerRef} />
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
      <div className="map-controls" aria-label="Kontrolki mapy">
        <div className="map-mode-toggle" role="group" aria-label="Cena lub ocena">
          <button
            type="button"
            className="map-mode-toggle-btn"
            aria-pressed={mode === 'rating'}
            aria-label="Pokaż oceny"
            onClick={() => setMode('rating')}
          >
            <svg className="map-mode-toggle-star" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            className="map-mode-toggle-btn"
            aria-pressed={mode === 'price'}
            aria-label="Pokaż ceny"
            onClick={() => setMode('price')}
          >
            <svg className="map-mode-toggle-dollar" viewBox="0 0 24 24" aria-hidden="true">
              <text
                x="12"
                y="18"
                textAnchor="middle"
                fontSize="18"
                fontFamily="Inter, sans-serif"
                fontWeight="700"
                fill="currentColor"
              >
                $
              </text>
            </svg>
          </button>
        </div>
        <button type="button" aria-label="Przybliż" onClick={() => mapRef.current?.zoomIn()}>
          +
        </button>
        <button type="button" aria-label="Oddal" onClick={() => mapRef.current?.zoomOut()}>
          −
        </button>
        <button className="map-locate" type="button" aria-label="Moja lokalizacja">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" fill="none" stroke="var(--bg-foam)" strokeWidth="2.5" />
            <path
              d="M12 3.5 V7.2 M12 16.8 V20.5 M3.5 12 H7.2 M16.8 12 H20.5"
              fill="none"
              stroke="var(--bg-foam)"
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
