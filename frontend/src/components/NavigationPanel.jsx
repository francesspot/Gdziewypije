import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
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

function CarModeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M5 15 H19 M6 13 L8 8 H16 L18 13 M7.5 17 A1.5 1.5 0 1 1 7.5 14 A1.5 1.5 0 1 1 7.5 17 M16.5 17 A1.5 1.5 0 1 1 16.5 14 A1.5 1.5 0 1 1 16.5 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FootModeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="6.5" r="2" fill="currentColor" />
      <path
        d="M12 9 V14 M10 11 L14 11 M11 14 L9.5 19 M13 14 L14.5 19 M10.5 17 L8.5 19 M13.5 17 L15.5 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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

function SearchMagnifierIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M15.5 15.5 L19.5 19.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PillClearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M7 7 L17 17 M17 7 L7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

const NavigationPanel = forwardRef(function NavigationPanel(
  {
    open,
    barsVersion,
    navigation,
    userPosition,
    navPickTarget,
    onNavPickTargetChange,
    onNavigationChange,
    onClearRoute,
    onClose,
  },
  ref,
) {
  const [bars, setBars] = useState([])
  const [originText, setOriginText] = useState('')
  const [destText, setDestText] = useState('')
  const [destSuggestions, setDestSuggestions] = useState([])
  const [routeError, setRouteError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [routePending, setRoutePending] = useState(false)
  const destEditingRef = useRef(false)
  const wasOpenRef = useRef(false)

  useImperativeHandle(ref, () => ({
    reportRouteError(message) {
      setRouteError(message)
    },
    clearRouteError() {
      setRouteError('')
    },
  }))

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

  function handleUseMyLocation() {
    setValidationError('')
    setRouteError('')
    if (!userPosition) {
      setValidationError('Ustaw lokalizację na mapie, a potem wybierz „Użyj lokalizacji”.')
      return
    }
    onNavPickTargetChange?.(null)
    onNavigationChange((prev) => ({
      ...prev,
      origin: {
        lat: userPosition.lat,
        lon: userPosition.lon,
        label: 'Moja lokalizacja',
      },
      route: null,
      distanceM: null,
      durationS: null,
    }))
    setOriginText('Moja lokalizacja')
  }

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
    onNavPickTargetChange?.(null)
    onNavigationChange((prev) => ({
      ...prev,
      dest: { lat: bar.latitude, lon: bar.longitude, label: bar.name },
      route: null,
      distanceM: null,
      durationS: null,
    }))
  }

  function activatePickTarget(target) {
    onNavPickTargetChange?.(target)
    setValidationError('')
    setRouteError('')
  }

  function handleSwap() {
    destEditingRef.current = false
    setValidationError('')
    setRouteError('')
    // Teksty pól ustawiane poza funkcją przekazaną do setState, bo ta funkcja nie powinna zmieniać innego stanu.
    setOriginText(navigation.dest?.label ?? '')
    setDestText(navigation.origin?.label ?? '')
    onNavigationChange((prev) => ({
      ...prev,
      origin: prev.dest,
      dest: prev.origin,
      route: null,
      distanceM: null,
      durationS: null,
    }))
  }

  async function runRouteComputation(origin, dest, profileOverride) {
    setRouteError('')
    setValidationError('')

    if (!origin?.lat || !origin?.lon) {
      setValidationError(
        'Ustaw punkt początkowy — użyj lokalizacji na mapie albo zamień punkty z celem, który ma współrzędne.',
      )
      return false
    }
    if (!dest?.lat || !dest?.lon) {
      setValidationError('Wybierz miejsce docelowe z listy barów lub z mapy (przycisk Nawigacja w okienku baru).')
      return false
    }

    setRoutePending(true)
    try {
      const profile = profileOverride ?? navigation.routeProfile ?? 'driving'
      const result = await fetchOsrmRoute(origin.lat, origin.lon, dest.lat, dest.lon, profile)
      onNavigationChange((prev) => ({ ...prev, ...result }))
      return true
    } catch (err) {
      setRouteError(err.message)
      onClearRoute()
      return false
    } finally {
      setRoutePending(false)
    }
  }

  async function handleComputeRoute() {
    await runRouteComputation(navigation.origin, navigation.dest)
  }

  function handleClearRoute() {
    setRouteError('')
    onClearRoute()
  }

  function handleClearOrigin() {
    setValidationError('')
    setRouteError('')
    onNavPickTargetChange?.(null)
    setOriginText('')
    onNavigationChange((prev) => ({
      ...prev,
      origin: null,
      route: null,
      distanceM: null,
      durationS: null,
    }))
    onClearRoute()
  }

  function handleClearDest() {
    destEditingRef.current = false
    setValidationError('')
    setRouteError('')
    onNavPickTargetChange?.(null)
    setDestText('')
    setDestSuggestions([])
    onNavigationChange((prev) => ({
      ...prev,
      dest: null,
      route: null,
      distanceM: null,
      durationS: null,
    }))
    onClearRoute()
  }

  async function setRouteProfile(profile) {
    setRouteError('')
    const origin = navigation.origin
    const dest = navigation.dest
    onNavigationChange((prev) => ({
      ...prev,
      routeProfile: profile,
      route: null,
      distanceM: null,
      durationS: null,
    }))
    if (origin?.lat != null && dest?.lat != null) {
      await runRouteComputation(origin, dest, profile)
    }
  }

  const routeProfile = navigation.routeProfile ?? 'driving'
  const hasRoute = navigation.route != null && navigation.route.length > 0
  const showOriginClear =
    originText.trim() !== '' || (navigation.origin?.lat != null && navigation.origin?.lon != null)
  const showDestClear =
    destText.trim() !== '' || (navigation.dest?.lat != null && navigation.dest?.lon != null)

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
        <div className="nav-header-row panel-nav-row">
          <button className="close-button" type="button" onClick={onClose} aria-label="Zamknij nawigację">
            <CloseArrow direction="left" />
          </button>
          <h1>Wskazówki dojazdu</h1>
        </div>
        <div className="top-divider" />
      </header>

      <div className="nav-mode-toggle" role="group" aria-label="Tryb trasy">
        <button
          type="button"
          className="nav-mode-btn"
          aria-pressed={routeProfile === 'driving'}
          onClick={() => setRouteProfile('driving')}
        >
          <CarModeIcon />
          Samochód
        </button>
        <button
          type="button"
          className="nav-mode-btn"
          aria-pressed={routeProfile === 'foot'}
          onClick={() => setRouteProfile('foot')}
        >
          <FootModeIcon />
          Pieszo
        </button>
      </div>

      <div className="nav-route-block">
        <div className="nav-track" aria-hidden="true">
          <span className="nav-track-dot nav-track-dot-origin" />
          <span className="nav-track-line" />
          <span className="nav-track-pin" />
        </div>

        <div className="nav-inputs">
          <div className="nav-field-row nav-field-origin">
            <div className="nav-pill-wrap">
              <input
                className={[
                  'nav-pill-input',
                  navPickTarget === 'origin' ? 'nav-pill-input--pick-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="text"
                readOnly
                placeholder="Wybierz punkt początkowy"
                value={originText}
                aria-label="Punkt początkowy"
                onFocus={() => activatePickTarget('origin')}
                onClick={() => activatePickTarget('origin')}
              />
              {showOriginClear ? (
                <button
                  type="button"
                  className="nav-pill-clear-btn"
                  aria-label="Wyczyść punkt początkowy"
                  onClick={handleClearOrigin}
                >
                  <PillClearIcon />
                </button>
              ) : (
                <span className="nav-field-search-icon">
                  <SearchMagnifierIcon />
                </span>
              )}
            </div>
            {navPickTarget === 'origin' ? (
              <p className="nav-pick-hint" role="status">
                Kliknij punkt na mapie lub bar.
              </p>
            ) : null}
            {userPosition ? (
              <button type="button" className="nav-use-location-btn" onClick={handleUseMyLocation}>
                Użyj lokalizacji
              </button>
            ) : null}
          </div>
          <div className="nav-field-row nav-field-dest">
            <div className="nav-pill-wrap">
              <input
                className={[
                  'nav-pill-input',
                  navPickTarget === 'dest' ? 'nav-pill-input--pick-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="search"
                placeholder="Wybierz miejsce docelowe"
                value={destText}
                aria-label="Miejsce docelowe"
                onChange={(event) => handleDestInput(event.target.value)}
                onFocus={() => {
                  activatePickTarget('dest')
                  if (destText.trim().length >= 2) {
                    handleDestInput(destText)
                  }
                }}
                onClick={() => activatePickTarget('dest')}
                onBlur={() => {
                  window.setTimeout(() => setDestSuggestions([]), 150)
                }}
              />
              {showDestClear ? (
                <button
                  type="button"
                  className="nav-pill-clear-btn"
                  aria-label="Wyczyść miejsce docelowe"
                  onClick={handleClearDest}
                >
                  <PillClearIcon />
                </button>
              ) : (
                <span className="nav-field-search-icon">
                  <SearchMagnifierIcon />
                </span>
              )}
            </div>
            {navPickTarget === 'dest' && destSuggestions.length === 0 ? (
              <p className="nav-pick-hint" role="status">
                Kliknij punkt na mapie lub bar.
              </p>
            ) : null}
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

        <button
          type="button"
          className="nav-swap-btn"
          onClick={handleSwap}
          aria-label="Zamień punkt początkowy z docelowym"
        >
          <SwapIcon />
        </button>
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
        <button type="button" className="nav-clear-btn" onClick={handleClearRoute}>
          Wyczyść trasę
        </button>
      ) : null}

      {hasRoute ? (
        <div className="nav-summary">
          <p className="nav-summary-stats">
            <span>{formatDistance(navigation.distanceM)}</span>
            <span aria-hidden="true"> · </span>
            <span>ok. {formatEta(navigation.durationS)}</span>
          </p>
        </div>
      ) : null}
    </aside>
  )
})

export default NavigationPanel