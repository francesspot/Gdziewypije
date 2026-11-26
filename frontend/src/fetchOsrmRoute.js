// Trasa z publicznych serwerów OSRM. Pieszo używany jest osobny serwer z grafem chodników,
// bo demo router.project-osrm.org dla profilu foot zwraca tę samą trasę co dla samochodu.
const CAR_ROUTE_BASE = 'https://router.project-osrm.org/route/v1/driving'
const FOOT_ROUTE_BASE = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'

// profile: 'driving' albo 'foot'. Wynik ma te same klucze co stan nawigacji, więc można go od razu dołączyć do stanu.
export async function fetchOsrmRoute(lat1, lon1, lat2, lon2, profile = 'driving') {
  const base = profile === 'foot' ? FOOT_ROUTE_BASE : CAR_ROUTE_BASE
  // OSRM przyjmuje współrzędne w kolejności długość, szerokość
  const url = `${base}/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&steps=false`

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
  return {
    // Leaflet przyjmuje punkty jako [szerokość, długość], a GeoJSON zwraca [długość, szerokość]
    route: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    distanceM: route.distance,
    durationS: route.duration,
  }
}
