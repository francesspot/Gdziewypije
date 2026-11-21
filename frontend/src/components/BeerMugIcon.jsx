const COLORS = {
  outline: '#231B15',
  beer: '#E8A838',
  beerHighlight: '#F2B84B',
  glass: '#EDE4D3',
  foam: '#FFFFFF',
  foamBubble: '#D6CFC2',
  cutout: '#FAF6EE',
}

const FLUTE_X = [22.5, 34, 45.5, 57]

const FOAM_BUBBLES = [
  { cx: 34, cy: 16, r: 2.2 },
  { cx: 44, cy: 18, r: 2.2 },
  { cx: 38, cy: 25, r: 2.4 },
  { cx: 27, cy: 26, r: 2.2 },
  { cx: 62, cy: 24, r: 2.2 },
  { cx: 68, cy: 28, r: 2.0 },
  { cx: 12, cy: 35, r: 2.0 },
]

function BeerMugIcon({ className = 'beer-mug-icon' }) {
  return (
    <svg className={className} viewBox="0 0 100 116" aria-hidden="true">
      <path
        d="M70 48H82C88 48 92 52 92 58V84C92 90 88 94 82 94H70V48Z"
        fill={COLORS.glass}
        stroke={COLORS.outline}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d="M70 57H80C82 57 83 58 83 60V82C83 84 82 85 80 85H70V57Z"
        fill={COLORS.cutout}
        stroke={COLORS.outline}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect
        x="16"
        y="34"
        width="54"
        height="74"
        rx="4"
        fill={COLORS.beer}
        stroke={COLORS.outline}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <rect
        x="16"
        y="98"
        width="54"
        height="10"
        rx="2"
        fill={COLORS.glass}
        stroke={COLORS.outline}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      {FLUTE_X.map((x) => (
        <rect
          key={x}
          x={x}
          y="50"
          width="7.5"
          height="41"
          rx="3.75"
          fill={COLORS.beerHighlight}
          stroke={COLORS.outline}
          strokeWidth="3.5"
        />
      ))}
      <path
        d="M12 63C9.5 63 8 61 8 57V34C8 22 16 16 24 17C26 8 36 4 46 8C52 10 55 15 56 19C61 15 70 16 74 23C79 25 81 31 77 35C74 38 71 37 70 34C67 34 66 41 61.5 41C57 41 56 34 53 34C49 34 48 44 42.5 44C37 44 36 34 32 34C28 34 27 41 22.5 41C18 41 17 36 16 36V57C16 61 14.5 63 12 63Z"
        fill={COLORS.foam}
        stroke={COLORS.outline}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {FOAM_BUBBLES.map((bubble) => (
        <circle key={`${bubble.cx}-${bubble.cy}`} fill={COLORS.foamBubble} {...bubble} />
      ))}
    </svg>
  )
}

export default BeerMugIcon