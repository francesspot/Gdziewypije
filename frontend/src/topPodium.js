import { PLACEHOLDER_BARS } from './placeholderBars'

// Liczba kufli zależna od miejsca na podium (nie od surowej oceny 1–5).
const MUGS_BY_RANK = [5, 4, 2]

export function buildTopPodium(bars = PLACEHOLDER_BARS) {
  const sorted = [...bars].sort((a, b) => b.rating - a.rating)
  const [first, second, third] = sorted

  return [
    { bar: second, mugCount: MUGS_BY_RANK[1] },
    { bar: first, mugCount: MUGS_BY_RANK[0] },
    { bar: third, mugCount: MUGS_BY_RANK[2] },
  ]
}