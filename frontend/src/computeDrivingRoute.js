import { fetchOsrmRoute } from './fetchOsrmRoute'

/** Trasa OSRM — ten sam kontrakt co fetchOsrmRoute (profil: driving | foot). */
export async function computeDrivingRoute(lat1, lon1, lat2, lon2, profile = 'driving') {
  return fetchOsrmRoute(lat1, lon1, lat2, lon2, profile)
}

/** Uzupełnia stan nawigacji wynikiem trasy (setState z funkcją lub bez). */
export function applyRouteToNavigation(setNavigation, result) {
  setNavigation((prev) => mergeRouteIntoNavigation(prev, result))
}

export function mergeRouteIntoNavigation(prev, result) {
  return {
    ...prev,
    route: result.coords,
    distanceM: result.distanceM,
    durationS: result.durationS,
  }
}