/**
 * Trasa samochodowa z publicznego serwera OSRM (bez klucza API).
 */
export async function fetchOsrmRoute(lat1, lon1, lat2, lon2) {
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`

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