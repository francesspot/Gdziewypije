import { useEffect, useRef, useState } from 'react'
import { getBars } from '../api'
import { fetchOsrmRoute } from '../fetchOsrmRoute'
import CloseArrow from './CloseArrow'

function formatDistance(meters) {
  if (meters == null) {
    return ''
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`
  }
  return `${Math.round(meters)} m`
}

function formatEta(seconds) {
  if (seconds == null) {
    return ''
  }
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min`
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M7 4 L7 9 M7 4 L4 7 M7 4 L10 7 M17 20 L17 15 M17 20 L14 17 M17 20 L20 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavigationPanel({
  open,
  barsVersion,
  navigation,
  onNavigationChange,
  onClearRoute,
  onClose,
}) {
  const [bars, setBars] = useState([])
  const [originText, setOriginText] = useState('')
  const [destText, setDestText] = useState('')
  const [destSuggestions, setDestSuggestions] = useState([])
  const [routeError, setRouteError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [routePending, setRoutePending] = useState(false)
  const destEditingRef = useRef(false)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    getBars()
      .then((data) => {
        if (!cancelled) {
          setBars(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBars([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, barsVersion])

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      destEditingRef.current = false
      return
    }

    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true

    setOriginText(navigation.origin?.label ?? '')

    // Pole celu synchronizuje się przy otwarciu panelu lub po wyborze z mapy, nie przy każdym klawiszu.
    if (justOpened || !destEditingRef.current) {
      setDestText(navigation.dest?.label ?? '')
    }
  }, [open, navigation.origin, navigation.dest])

  function handleDestInput(value) {
    destEditingRef.current = true
    setDestText(value)
    setValidationError('')
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setDestSuggestions([])
      onNavigationChange((prev) => ({ ...prev, dest: null }))
      return
    }
    const lower = trimmed.toLowerCase()
    const matches = bars
      .filter((bar) => bar.name.toLowerCase().includes(lower))
      .slice(0, 6)
    setDestSuggestions(matches)
    const exact = bars.find((bar) => bar.name.toLowerCase() === lower)
    if (exact) {
      onNavigationChange((prev) => ({
        ...prev,
        dest: { lat: exact.latitude, lon: exact.longitude, label: exact.name },
      }))
    } else if (!navigation.dest || navigation.dest.label !== trimmed) {
      onNavigationChange((prev) => ({ ...prev, dest: null, route: null, distanceM: null, durationS: null }))
    }
  }

  function pickDestBar(bar) {
    destEditingRef.current = false
    setDestText(bar.name)
    setDestSuggestions([])
    setValidationError('')
    onNavigationChange((prev) => ({
      ...prev,
      dest: { lat: bar.latitude, lon: bar.longitude, label: bar.name },
      route: null,
      distanceM: null,
      durationS: null,
    }))
  }

  function handleSwap() {
    destEditingRef.current = false
    setValidationError('')
    setRouteError('')
    onNavigationChange((prev) => {
      const nextOrigin = prev.dest
      const nextDest = prev.origin
      setOriginText(nextOrigin?.label ?? '')
      setDestText(nextDest?.label ?? '')
      return {
        ...prev,
        origin: nextOrigin,
        dest: nextDest,
        route: null,
        distanceM: null,
        durationS: null,
      }
    })
  }

  async function handleComputeRoute() {
    setRouteError('')
    setValidationError('')
    const origin = navigation.origin
    const dest = navigation.dest

    if (!origin?.lat || !origin?.lon) {
      setValidationError(
        'Ustaw punkt początkowy — użyj lokalizacji na mapie albo zamień punkty z celem, który ma współrzędne.',
      )
      return
    }
    if (!dest?.lat || !dest?.lon) {
      setValidationError('Wybierz miejsce docelowe z listy barów lub z mapy (przycisk Nawigacja w okienku baru).')
      return
    }

    setRoutePending(true)
    try {
      const result = await fetchOsrmRoute(origin.lat, origin.lon, dest.lat, dest.lon)
      onNavigationChange((prev) => ({
        ...prev,
        route: result.coords,
        distanceM: result.distanceM,
        durationS: result.durationS,
      }))
    } catch (err) {
      setRouteError(err.message)
      onClearRoute()
    } finally {
      setRoutePending(false)
    }
  }

  function handleClearRoute() {
    setRouteError('')
    onClearRoute()
  }

  const hasRoute = navigation.route != null && navigation.route.length > 0

  return (
    <aside
      className={['side-panel', 'side-panel-left', 'nav-panel', open ? 'is-open' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Wskazówki dojazdu"
      aria-hidden={!open}
      inert={!open}
    >
      <header className="nav-header">
        <div className="panel-nav-row">
          <button className="close-button" type="button" onClick={onClose} aria-label="Zamknij nawigację">
            <CloseArrow direction="left" />
          </button>
        </div>
        <div className="top-divider" />
        <h1>Wskazówki dojazdu</h1>
      </header>

      <div className="nav-track" aria-hidden="true">
        <span className="nav-track-dot nav-track-dot-origin" />
        <span className="nav-track-line" />
        <span className="nav-track-pin" />
      </div>

      <div className="nav-fields">
        <div className="nav-field-row">
          <input
            className="nav-pill-input"
            type="text"
            readOnly
            placeholder="Wybierz punkt początkowy"
            value={originText}
            aria-label="Punkt początkowy"
          />
        </div>
        <button
          type="button"
          className="nav-swap-btn"
          onClick={handleSwap}
          aria-label="Zamień punkt początkowy z docelowym"
        >
          <SwapIcon />
        </button>
        <div className="nav-field-row nav-field-dest">
          <input
            className="nav-pill-input"
            type="search"
            placeholder="Wybierz miejsce docelowe"
            value={destText}
            aria-label="Miejsce docelowe"
            onChange={(event) => handleDestInput(event.target.value)}
            onFocus={() => {
              if (destText.trim().length >= 2) {
                handleDestInput(destText)
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setDestSuggestions([]), 150)
            }}
          />
          {destSuggestions.length > 0 ? (
            <ul className="nav-suggestions" role="listbox">
              {destSuggestions.map((bar) => (
                <li key={bar.id}>
                  <button type="button" role="option" onMouseDown={() => pickDestBar(bar)}>
                    {bar.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {validationError ? (
        <p className="nav-error" role="alert">
          {validationError}
        </p>
      ) : null}
      {routeError ? (
        <p className="nav-error" role="alert">
          {routeError}
        </p>
      ) : null}

      <button
        type="button"
        className="nav-route-btn"
        disabled={routePending}
        onClick={handleComputeRoute}
      >
        {routePending ? 'Wyznaczanie…' : 'Wyznacz trasę'}
      </button>

      {hasRoute ? (
        <div className="nav-summary">
          <p className="nav-summary-stats">
            <span>{formatDistance(navigation.distanceM)}</span>
            <span aria-hidden="true"> · </span>
            <span>ok. {formatEta(navigation.durationS)}</span>
          </p>
          <button type="button" className="nav-clear-btn" onClick={handleClearRoute}>
            Wyczyść trasę
          </button>
        </div>
      ) : null}
    </aside>
  )
}

export default NavigationPanel