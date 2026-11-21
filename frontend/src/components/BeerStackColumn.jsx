import BeerMugIcon from './BeerMugIcon'

const WOBBLE = [
  { x: -1.5, deg: -0.8 },
  { x: 1, deg: 0.6 },
  { x: -0.5, deg: 0.8 },
  { x: 1.2, deg: -0.5 },
  { x: 0, deg: 0.4 },
]

function formatAvgRating(avgRating) {
  return avgRating == null ? '\u2013' : avgRating.toFixed(1)
}

function BeerStackColumn({ bar, mugCount }) {
  const mugs = Array.from({ length: mugCount }, (_, index) => index)

  return (
    <div className="beer-stack-column">
      <p className="beer-stack-label">
        <span className="beer-stack-name">{bar.name}</span>
        <span className="beer-stack-meta">{formatAvgRating(bar.avg_rating)}</span>
      </p>
      <div className="beer-stack">
        {mugs.map((index) => {
          const wobble = WOBBLE[index % WOBBLE.length]
          return (
            <div
              key={index}
              className="beer-stack-mug"
              style={{
                '--mug-x': `${wobble.x}px`,
                '--mug-r': `${wobble.deg}deg`,
                '--mug-i': index,
              }}
            >
              <div className="beer-stack-mug-anim">
                <BeerMugIcon />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BeerStackColumn