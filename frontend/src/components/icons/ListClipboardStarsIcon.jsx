const ROWS = [
  { cy: 8.5, lines: [7.8, 9.4] },
  { cy: 13.5, lines: [12.8, 14.4] },
  { cy: 18.5, lines: [17.8, 19.4] },
]

const STAR_CX = 8
const STAR_RADIUS = 1.6

function fivePointStarPath(cx, cy, r) {
  const inner = r * 0.42
  const points = []
  for (let i = 0; i < 5; i += 1) {
    const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const innerAngle = outerAngle + Math.PI / 5
    points.push([
      cx + r * Math.cos(outerAngle),
      cy + r * Math.sin(outerAngle),
      cx + inner * Math.cos(innerAngle),
      cy + inner * Math.sin(innerAngle),
    ])
  }
  return points
    .map(([ox, oy, ix, iy], i) => `${i === 0 ? 'M' : 'L'}${ox},${oy} L${ix},${iy}`)
    .join(' ')
    .concat(' Z')
}

function ListClipboardStarsIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="1.5" x2="8" y2="5" />
      <line x1="16" y1="1.5" x2="16" y2="5" />
      <rect x="4" y="3" width="16" height="19" rx="1.5" />
      {ROWS.map((row) => (
        <g key={row.cy}>
          <path d={fivePointStarPath(STAR_CX, row.cy, STAR_RADIUS)} fill="currentColor" stroke="none" />
          {row.lines.map((y) => (
            <line key={y} x1="11.5" x2="17.5" y1={y} y2={y} />
          ))}
        </g>
      ))}
    </svg>
  )
}

export default ListClipboardStarsIcon
