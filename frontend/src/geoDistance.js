const EARTH_RADIUS_M = 6_371_000

function toRadians(deg) {
  return (deg * Math.PI) / 180
}

/** Odległość w linii prostej (haversine) w metrach. */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1)
  const φ2 = toRadians(lat2)
  const Δφ = toRadians(lat2 - lat1)
  const Δλ = toRadians(lon2 - lon1)

  const sinHalfΔφ = Math.sin(Δφ / 2)
  const sinHalfΔλ = Math.sin(Δλ / 2)
  const a =
    sinHalfΔφ * sinHalfΔφ + Math.cos(φ1) * Math.cos(φ2) * sinHalfΔλ * sinHalfΔλ
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

export function formatDistanceMeters(distanceM) {
  if (distanceM < 1000) {
    return `${Math.round(distanceM)} m`
  }
  return `${(distanceM / 1000).toLocaleString('pl-PL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`
}