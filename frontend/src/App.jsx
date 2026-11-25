import { useEffect, useRef, useState } from 'react'
import { applyRouteToNavigation, computeDrivingRoute } from './computeDrivingRoute'
import {
  addFavorite,
  clearSession,
  confirmPrice,
  getFavorites,
  getMe,
  getSession,
  rateBar,
  removeFavorite,
  reportPrice,
  setSession,
} from './api'
import AccountPanel from './components/AccountPanel'
import AdminPanel from './components/AdminPanel'
import LeftToolRail from './components/LeftToolRail'
import ListPanel from './components/ListPanel'
import MapScreen from './components/MapScreen'
import NavigationPanel from './components/NavigationPanel'
import TopPanel from './components/TopPanel'
import './App.css'

const EMPTY_NAVIGATION = {
  origin: null,
  dest: null,
  route: null,
  distanceM: null,
  durationS: null,
  routeProfile: 'driving',
}

function App() {
  const [navOpen, setNavOpen] = useState(false)
  const [navPickTarget, setNavPickTarget] = useState(null)
  const [topOpen, setTopOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [navigation, setNavigation] = useState(EMPTY_NAVIGATION)
  const [favoriteIds, setFavoriteIds] = useState([])
  // Stan w App, bo okienko baru otwiera zarówno marker na mapie, jak i pozycja na liście.
  const [selectedBarId, setSelectedBarId] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)
  // Sesja z localStorage, żeby po odświeżeniu strony użytkownik był dalej zalogowany
  const [user, setUser] = useState(() => getSession()?.user ?? null)
  const [favoriteError, setFavoriteError] = useState('')
  // Zwiększenie licznika każe mapie, liście, TOP i okienku baru pobrać dane od nowa
  const [barsVersion, setBarsVersion] = useState(0)
  // Samo id w zależnościach, bo odświeżenie danych konta (getMe) daje nowy obiekt tego samego użytkownika
  const userId = user?.id ?? null
  const [adminOpen, setAdminOpen] = useState(false)
  // Stan na listę „w pobliżu” (zadanie 4); ustawiany po udanej lokalizacji na mapie
  const [userPosition, setUserPosition] = useState(null)
  const navigationPanelRef = useRef(null)
  // Rola jest sprawdzana też w backendzie (403), tutaj decyduje tylko o pokazaniu panelu
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    // Token mógł wygasnąć albo konto zostało wyłączone, więc zapisana sesja jest sprawdzana w backendzie
    const session = getSession()
    if (!session) {
      return
    }
    let cancelled = false

    getMe()
      .then((me) => {
        if (!cancelled) {
          setSession({ ...session, user: me })
          setUser(me)
        }
      })
      .catch((err) => {
        // Tylko 401 oznacza nieważny token; brak połączenia z serwerem nie wylogowuje.
        // Porównanie tokenu chroni sesję, gdy użytkownik zalogował się ponownie przed odpowiedzią.
        if (
          !cancelled &&
          err.status === 401 &&
          getSession()?.access_token === session.access_token
        ) {
          clearSession()
          setUser(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (userId == null) {
      return
    }
    let cancelled = false

    getFavorites()
      .then((favorites) => {
        if (!cancelled) {
          setFavoriteIds(favorites.map((favorite) => favorite.bar_id))
        }
      })
      .catch((err) => {
        // 401 obsługuje sprawdzenie sesji przy starcie, więc nie jest pokazywany drugi raz
        if (!cancelled && err.status !== 401) {
          setFavoriteError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!favoriteError) {
      return
    }
    const timer = setTimeout(() => setFavoriteError(''), 4000)
    return () => clearTimeout(timer)
  }, [favoriteError])

  useEffect(() => {
    if (!navOpen) {
      setNavPickTarget(null)
    }
  }, [navOpen])

  useEffect(() => {
    if (!navOpen || !userPosition) {
      return
    }
    setNavigation((prev) => {
      if (prev.origin) {
        return prev
      }
      return {
        ...prev,
        origin: {
          lat: userPosition.lat,
          lon: userPosition.lon,
          label: 'Moja lokalizacja',
        },
      }
    })
  }, [navOpen, userPosition])

  useEffect(() => {
    if (!userPosition) {
      return
    }
    setNavigation((prev) => {
      if (prev.origin?.label !== 'Moja lokalizacja') {
        return prev
      }
      if (prev.origin.lat === userPosition.lat && prev.origin.lon === userPosition.lon) {
        return prev
      }
      return {
        ...prev,
        origin: {
          lat: userPosition.lat,
          lon: userPosition.lon,
          label: 'Moja lokalizacja',
        },
      }
    })
  }, [userPosition])

  function handleLoggedIn(session) {
    setSession(session)
    setUser(session.user)
    setAccountOpen(false)
  }

  function handleLogout() {
    clearSession()
    setUser(null)
    setFavoriteIds([])
    setAccountOpen(false)
    setAdminOpen(false)
  }

  function openAdmin() {
    setAccountOpen(false)
    setAdminOpen(true)
  }

  // Wygasły token w trakcie pracy: wylogowanie i okno logowania zamiast samego komunikatu
  function handleUnauthorized() {
    clearSession()
    setUser(null)
    setFavoriteIds([])
    setAccountOpen(true)
  }

  async function toggleFavorite(barId) {
    // Ulubione ma tylko zalogowany użytkownik (WB.08), więc gość trafia do logowania
    if (!user) {
      setAccountOpen(true)
      return
    }
    const isFavorite = favoriteIds.includes(barId)
    try {
      if (isFavorite) {
        await removeFavorite(barId)
      } else {
        await addFavorite(barId)
      }
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      // 409 przy dodaniu i 404 przy usunięciu oznaczają, że backend ma już docelowy stan (np. zmiana w innej karcie)
      const alreadyDone = isFavorite ? err.status === 404 : err.status === 409
      if (!alreadyDone) {
        setFavoriteError(err.message)
        return
      }
    }
    setFavoriteError('')
    setFavoriteIds((current) =>
      isFavorite ? current.filter((id) => id !== barId) : [...current, barId],
    )
    // Ulubione z bieżącego miesiąca liczą się do TOP (v_top_month)
    setBarsVersion((version) => version + 1)
  }

  // Zwraca false, gdy ocena nie została zapisana, bo trzeba się zalogować; inne błędy pokazuje okienko baru
  async function handleRate(barId, value) {
    if (!user) {
      setAccountOpen(true)
      return false
    }
    try {
      await rateBar(barId, value)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return false
      }
      throw err
    }
    // Średnią liczy baza (v_bar_stats), więc nowa wartość wymaga ponownego pobrania barów
    setBarsVersion((version) => version + 1)
    return true
  }

  // Zwraca false, gdy trzeba się zalogować; inne błędy (np. 409 przy drugim potwierdzeniu) pokazuje okienko baru
  async function handleConfirmPrice(priceId, kind) {
    if (!user) {
      setAccountOpen(true)
      return false
    }
    try {
      await confirmPrice(priceId, kind)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return false
      }
      throw err
    }
    // Potwierdzenie zmienia datę ceny, więc okienko pobiera ceny od nowa i etykieta „do weryfikacji” znika
    setBarsVersion((version) => version + 1)
    return true
  }

  // Zwraca false, gdy trzeba się zalogować; inne błędy (422, 404) pokazuje formularz ceny
  async function handleReportPrice(barId, drinkId, amount) {
    if (!user) {
      setAccountOpen(true)
      return false
    }
    try {
      await reportPrice(barId, drinkId, amount)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return false
      }
      throw err
    }
    // Nowa cena jest od razu aktualną ceną (v_current_prices), więc mapa i okienko pobierają bary od nowa
    setBarsVersion((version) => version + 1)
    return true
  }

  function closeOtherLeftPanels(except) {
    if (except !== 'nav') {
      setNavOpen(false)
    }
    if (except !== 'top') {
      setTopOpen(false)
    }
    if (except !== 'list') {
      setListOpen(false)
    }
  }

  function toggleTop() {
    setTopOpen((wasOpen) => {
      if (wasOpen) {
        return false
      }
      closeOtherLeftPanels('top')
      return true
    })
  }

  function toggleList() {
    setListOpen((wasOpen) => {
      if (wasOpen) {
        return false
      }
      closeOtherLeftPanels('list')
      return true
    })
  }

  function toggleNav() {
    setNavOpen((wasOpen) => {
      if (wasOpen) {
        return false
      }
      closeOtherLeftPanels('nav')
      return true
    })
  }

  function handleNavigationChange(updater) {
    setNavigation((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }

  function handleClearRoute() {
    setNavigation((prev) => ({
      ...prev,
      route: null,
      distanceM: null,
      durationS: null,
    }))
  }

  function handleNavigationPick(lat, lon, label = 'Punkt na mapie') {
    if (!navPickTarget) {
      return
    }
    const field = navPickTarget === 'origin' ? 'origin' : 'dest'
    setNavigation((prev) => ({
      ...prev,
      [field]: { lat, lon, label },
      route: null,
      distanceM: null,
      durationS: null,
    }))
    setNavPickTarget(null)
  }

  function handleNavigationPickBar(bar) {
    if (!navPickTarget) {
      return
    }
    handleNavigationPick(bar.latitude, bar.longitude, bar.name)
  }

  async function handleNavigateToBar(bar) {
    const lat = bar.latitude ?? bar.lat
    const lon = bar.longitude ?? bar.lon
    setSelectedBarId(null)
    closeOtherLeftPanels('nav')
    setNavOpen(true)

    let origin = null
    let routeProfile = 'driving'
    setNavigation((prev) => {
      routeProfile = prev.routeProfile ?? 'driving'
      origin =
        prev.origin ??
        (userPosition
          ? {
              lat: userPosition.lat,
              lon: userPosition.lon,
              label: 'Moja lokalizacja',
            }
          : null)
      return {
        ...prev,
        dest: {
          lat,
          lon,
          label: bar.name,
        },
        origin,
        route: null,
        distanceM: null,
        durationS: null,
      }
    })

    navigationPanelRef.current?.clearRouteError?.()

    if (origin?.lat != null && origin?.lon != null && lat != null && lon != null) {
      try {
        const result = await computeDrivingRoute(origin.lat, origin.lon, lat, lon, routeProfile)
        applyRouteToNavigation(setNavigation, result)
        navigationPanelRef.current?.clearRouteError?.()
      } catch (err) {
        handleClearRoute()
        navigationPanelRef.current?.reportRouteError?.(err.message)
      }
    }
  }

  return (
    <div
      className={[
        'app',
        navOpen ? 'app-nav-open' : '',
        topOpen ? 'app-top-open' : '',
        listOpen ? 'app-list-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg className="sketch-filter" aria-hidden="true">
        <filter id="sketch">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.1" />
        </filter>
      </svg>
      <LeftToolRail
        navOpen={navOpen}
        topOpen={topOpen}
        listOpen={listOpen}
        onToggleNav={toggleNav}
        onToggleTop={toggleTop}
        onToggleList={toggleList}
      />
      <MapScreen
        selectedBarId={selectedBarId}
        favoriteIds={favoriteIds}
        barsVersion={barsVersion}
        loggedIn={user != null}
        navigation={navigation}
        navOpen={navOpen}
        navPickTarget={navPickTarget}
        onNavigationPick={handleNavigationPick}
        onNavigationPickBar={handleNavigationPickBar}
        onSelectBar={setSelectedBarId}
        onToggleFavorite={toggleFavorite}
        onRate={handleRate}
        onConfirmPrice={handleConfirmPrice}
        onReportPrice={handleReportPrice}
        onRequireLogin={() => setAccountOpen(true)}
        onUserLocationChange={setUserPosition}
        onNavigateToBar={handleNavigateToBar}
      />
      {!accountOpen ? (
        <button
          className="account-button"
          type="button"
          onClick={() => setAccountOpen(true)}
          aria-label={user ? `Konto: ${user.display_name}` : 'Zaloguj się'}
        >
          {user ? user.display_name : 'Zaloguj'}
        </button>
      ) : null}
      {favoriteError ? (
        <p className="favorite-error" role="alert">
          {favoriteError}
        </p>
      ) : null}
      <NavigationPanel
        ref={navigationPanelRef}
        open={navOpen}
        barsVersion={barsVersion}
        navigation={navigation}
        userPosition={userPosition}
        navPickTarget={navPickTarget}
        onNavPickTargetChange={setNavPickTarget}
        onNavigationChange={handleNavigationChange}
        onClearRoute={handleClearRoute}
        onClose={() => {
          setNavPickTarget(null)
          setNavOpen(false)
        }}
      />
      <TopPanel
        open={topOpen}
        barsVersion={barsVersion}
        onClose={() => setTopOpen(false)}
        onSwitchToList={() => {
          setTopOpen(false)
          setListOpen(true)
        }}
      />
      <ListPanel
        open={listOpen}
        barsVersion={barsVersion}
        favoriteIds={favoriteIds}
        userPosition={userPosition}
        onToggleFavorite={toggleFavorite}
        onSelectBar={setSelectedBarId}
        onClose={() => setListOpen(false)}
        onSwitchToTop={() => {
          setListOpen(false)
          setTopOpen(true)
        }}
      />
      <AccountPanel
        open={accountOpen}
        user={user}
        onClose={() => setAccountOpen(false)}
        onLoggedIn={handleLoggedIn}
        onLogout={handleLogout}
        onOpenAdmin={openAdmin}
      />
      <AdminPanel
        open={adminOpen && isAdmin}
        onClose={() => setAdminOpen(false)}
        onChanged={() => setBarsVersion((version) => version + 1)}
      />
    </div>
  )
}

export default App
