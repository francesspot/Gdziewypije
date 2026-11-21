// Liczba kufli zależna od miejsca na podium (nie od activity z API).
const MUGS_BY_RANK = [5, 4, 2]

export function buildTopPodium(bars) {
  const top = bars.slice(0, 3)

  if (top.length === 0) {
    return []
  }
  if (top.length === 1) {
    return [{ bar: top[0], mugCount: MUGS_BY_RANK[0] }]
  }
  if (top.length === 2) {
    return [
      { bar: top[1], mugCount: MUGS_BY_RANK[1] },
      { bar: top[0], mugCount: MUGS_BY_RANK[0] },
    ]
  }
  return [
    { bar: top[1], mugCount: MUGS_BY_RANK[1] },
    { bar: top[0], mugCount: MUGS_BY_RANK[0] },
    { bar: top[2], mugCount: MUGS_BY_RANK[2] },
  ]
}