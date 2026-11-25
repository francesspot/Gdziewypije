/**
 * Trasa z publicznego OSRM.
 * Samochód: router.project-osrm.org (profil driving).
 * Pieszo: routing.openstreetmap.de/routed-foot — osobny graf chodników,
 * bez jednokierunkówek i objazdów jak dla auta. Demo project-osrm.org
 * na profilu foot zwraca tę samą geometrię co driving.
 */

const CAR_ROUTE_BASE = 'https://router.project-osrm.org/route/v1/driving'
const FOOT_ROUTE_BASE = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'

function routeUrl(lat1, lon1, lat2, lon2, profile) {
  const coords = `${lon1},${lat1};${lon2},${lat2}`
  const base = profile === 'foot' || profile === 'walking' ? FOOT_ROUTE_BASE : CAR_ROUTE_BASE
  return `${base}/${coords}?overview=full&geometries=geojson&steps=false`
}

async function requestOsrmProfile(lat1, lon1, lat2, lon2, profile) {
  const url = routeUrl(lat1, lon1, lat2, lon2, profile)

  let response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('Brak połączenia z serwisem tras. Sprawdź internet i spróbuj ponownie.')
  }

  if (!response.ok) {
    throw new Error('Nie udało się pobrać trasy. Spróbuj ponownie później.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Nieprawidłowa odpowiedź serwisu tras.')
  }

  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error('Nie znaleziono trasy między wybranymi punktami.')
  }

  const route = data.routes[0]
  const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])

  return {
    coords,
    distanceM: route.distance,
    durationS: route.duration,
  }
}

export async function fetchOsrmRoute(lat1, lon1, lat2, lon2, profile = 'driving') {
  const osrmProfile = profile === 'walking' ? 'foot' : profile
  return requestOsrmProfile(lat1, lon1, lat2, lon2, osrmProfile)
}