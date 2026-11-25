import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { getBars } from '../api'
import BarPopup from './BarPopup'
import { USER_LOCATION_ARROW_MARKUP } from './icons/UserLocationArrowIcon'

const WROCLAW_CENTER = [51.11, 17.04]
const INITIAL_ZOOM = 13
const USER_LOCATION_ZOOM = 15
const USER_MARKER_SIZE = 64
const USER_MARKER_HALO_RADIUS = 26

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

// Ten sam napój we wszystkich barach, żeby ceny na mapie dało się porównać (WB.02).
const MAP_DRINK_NAME = 'Piwo lane'
const MAP_DRINK_VOLUME_ML = 500

function mapDrinkPriceAmount(prices) {
  // v_current_prices zwraca najwyżej jedną aktualną cenę na parę bar–napój.
  const price = (prices ?? []).find(
    (p) => p.drink_name === MAP_DRINK_NAME && p.volume_ml === MAP_DRINK_VOLUME_ML,
  )
  return price ? price.amount : null
}

function formatMarkerPrice(amount) {
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
    const amount = mapDrinkPriceAmount(bar.prices)
    labelText = escapeHtml(formatMarkerPrice(amount))
    iconWidth = amount == null ? BAR_MARKER_ICON_WIDTH_NO_DATA : BAR_MARKER_ICON_WIDTH_PRICE
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

function createUserLocationIcon(headingDeg) {
  const rotation = Number.isFinite(headingDeg) ? headingDeg : 0
  const html = `<div class="user-location-marker" role="img" aria-label="Twoja lokalizacja"><div class="user-location-halo"></div><div class="user-location-arrow" style="transform: rotate(${rotation}deg)">${USER_LOCATION_ARROW_MARKUP}</div></div>`
  return L.divIcon({
    className: '',
    html,
    iconSize: [USER_MARKER_SIZE, USER_MARKER_SIZE],
    iconAnchor: [USER_MARKER_SIZE / 2, USER_MARKER_SIZE / 2],
  })
}

function MapScreen({
  selectedBarId,
  favoriteIds,
  barsVersion,
  loggedIn,
  onSelectBar,
  onToggleFavorite,
  onRate,
  onConfirmPrice,
  onReportPrice,
  onRequireLogin,
  onUserLocationChange,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const geoPendingRef = useRef(false)
  const userMovedMapRef = useRef(false)
  const fitBoundsDoneRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [bars, setBars] = useState([])
  const [mode, setMode] = useState('rating')
  const [fetchError, setFetchError] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [geoPending, setGeoPending] = useState(false)
  const [geoAlert, setGeoAlert] = useState('')
  // Po wylogowaniu filtr nie działa, żeby mapa nie została pusta; po ponownym zalogowaniu wraca
  const showOnlyFavorites = onlyFavorites && loggedIn
  const noFavoritesVisible =
    showOnlyFavorites && bars.length > 0 && !bars.some((bar) => favoriteIds.includes(bar.id))

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
      if (userMarkerRef.current) {
        userMarkerRef.current = null
      }
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    if (!geoAlert) {
      return
    }
    const timer = setTimeout(() => setGeoAlert(''), 5000)
    return () => clearTimeout(timer)
  }, [geoAlert])

  function clearUserMarker() {
    const map = mapRef.current
    if (userMarkerRef.current && map) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }
    onUserLocationChange?.(null)
  }

  function handleLocate() {
    if (!navigator.geolocation || geoPendingRef.current || !mapRef.current) {
      return
    }

    clearUserMarker()
    setGeoAlert('')
    geoPendingRef.current = true
    setGeoPending(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        geoPendingRef.current = false
        setGeoPending(false)

        const map = mapRef.current
        if (!map) {
          return
        }

        const { latitude, longitude, heading } = position.coords
        const headingDeg = Number.isFinite(heading) ? heading : 0
        const marker = L.marker([latitude, longitude], {
          icon: createUserLocationIcon(headingDeg),
          interactive: false,
          zIndexOffset: 1000,
        })
        marker.addTo(map)
        userMarkerRef.current = marker
        map.setView([latitude, longitude], USER_LOCATION_ZOOM)

        onUserLocationChange?.({
          lat: latitude,
          lon: longitude,
          heading: Number.isFinite(heading) ? heading : null,
        })
      },
      (error) => {
        geoPendingRef.current = false
        setGeoPending(false)
        clearUserMarker()

        let message = ''
        if (error.code === 1) {
          message = 'Bez zgody na lokalizację mapa działa dalej.'
        } else if (error.code === 2) {
          message = 'Nie udało się ustalić lokalizacji.'
        } else if (error.code === 3) {
          message = 'Upłynął limit czasu na lokalizację.'
        }
        if (message) {
          setGeoAlert(message)
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  useEffect(() => {
    if (!mapReady) {
      return
    }
    const map = mapRef.current

    // Kliknięcie markera nie dociera do mapy (bubblingMouseEvents: false), więc to tylko klik w puste miejsce.
    function handleMapClick() {
      onSelectBar(null)
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [mapReady, onSelectBar])

  useEffect(() => {
    let cancelled = false

    getBars()
      .then((fetchedBars) => {
        // Odpowiedź po odmontowaniu (np. StrictMode) nie aktualizuje stanu.
        if (cancelled) {
          return
        }
        setFetchError('')
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
    // Zmiana barsVersion po zapisie w panelu administratora pobiera bary od nowa
  }, [barsVersion])

  useEffect(() => {
    if (!mapReady) {
      return
    }
    const map = mapRef.current
    if (!map) {
      return
    }

    // Poprzednią warstwę usuwa cleanup tego efektu przed kolejnym uruchomieniem.
    const layer = L.layerGroup()
    const boundsPoints = []

    // Filtr „tylko ulubione” (HU.08) ukrywa pozostałe markery, ale nie zmienia pobranej listy barów
    const visibleBars = showOnlyFavorites
      ? bars.filter((bar) => favoriteIds.includes(bar.id))
      : bars

    for (const bar of visibleBars) {
      const point = [bar.latitude, bar.longitude]
      // title daje podpowiedź po najechaniu.
      L.marker(point, { icon: createBarMarkerIcon(mode, bar), title: bar.name })
        .on('click', () => onSelectBar(bar.id))
        .addTo(layer)
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
  }, [bars, mode, mapReady, onSelectBar, showOnlyFavorites, favoriteIds])

  return (
    <section className="map-screen" aria-label="Mapa">
      {fetchError ? (
        <p className="map-fetch-error" role="alert">
          {fetchError}
        </p>
      ) : null}
      {noFavoritesVisible ? (
        <p className="map-status" role="status">
          Brak ulubionych barów
        </p>
      ) : null}
      {geoAlert ? (
        <p className="map-geo-alert" role="status">
          {geoAlert}
        </p>
      ) : null}
      <div className="map-canvas" ref={mapContainerRef} />
      {selectedBarId != null ? (
        <BarPopup
          key={selectedBarId}
          barId={selectedBarId}
          isFavorite={favoriteIds.includes(selectedBarId)}
          barsVersion={barsVersion}
          onToggleFavorite={onToggleFavorite}
          onRate={onRate}
          onConfirmPrice={onConfirmPrice}
          onReportPrice={onReportPrice}
          onClose={() => onSelectBar(null)}
        />
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
            aria-label="Pokaż ceny piwa lanego 500 ml"
            title="Ceny piwa lanego 500 ml"
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
        <button
          className="map-favorites"
          type="button"
          aria-pressed={showOnlyFavorites}
          aria-label="Pokaż tylko ulubione"
          title="Tylko ulubione"
          // Ulubione ma tylko zalogowany użytkownik, więc gość trafia do logowania
          onClick={() => (loggedIn ? setOnlyFavorites((current) => !current) : onRequireLogin())}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.2 14.6 8.8 20.8 9.4 16.2 13.6 17.6 19.8 12 16.8 6.4 19.8 7.8 13.6 3.2 9.4 9.4 8.8 Z"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button type="button" aria-label="Przybliż" onClick={() => mapRef.current?.zoomIn()}>
          +
        </button>
        <button type="button" aria-label="Oddal" onClick={() => mapRef.current?.zoomOut()}>
          −
        </button>
        <button
          className="map-locate"
          type="button"
          aria-label="Pokaż swoją lokalizację"
          title="Pokaż swoją lokalizację"
          aria-busy={geoPending || undefined}
          disabled={geoPending}
          onClick={handleLocate}
        >
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
