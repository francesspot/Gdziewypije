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

function MapScreen({ topOpen, listOpen, favoriteIds, onOpenTop, onOpenList }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const [fetchError, setFetchError] = useState('')

  // Parametr zostaje dla późniejszych ulubionych; odwołanie gasi ostrzeżenie o nieużyciu.
  void favoriteIds

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

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getBars()
      .then((bars) => {
        // Odpowiedź po odmontowaniu (np. StrictMode) nie aktualizuje mapy.
        if (cancelled) {
          return
        }
        const map = mapRef.current
        if (!map) {
          return
        }

        setFetchError('')

        const layer = L.layerGroup()
        const boundsPoints = []

        for (const bar of bars) {
          const { latitude, longitude } = bar
          if (latitude == null || longitude == null) {
            continue
          }
          L.marker([latitude, longitude]).addTo(layer)
          boundsPoints.push([latitude, longitude])
        }

        layer.addTo(map)
        markersLayerRef.current = layer

        if (boundsPoints.length > 0) {
          map.fitBounds(boundsPoints, { padding: [40, 40] })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err.message)
        }
      })

    return () => {
      cancelled = true
      const map = mapRef.current
      const layer = markersLayerRef.current
      if (map && layer) {
        map.removeLayer(layer)
      }
      markersLayerRef.current = null
    }
  }, [])

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