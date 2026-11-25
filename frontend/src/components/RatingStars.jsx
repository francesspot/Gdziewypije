const STAR_VALUES = [1, 2, 3, 4, 5]

// Pięć przycisków zamiast pola liczbowego, bo ocena ma tylko wartości 1–5 (WF.09)
function RatingStars({ value, disabled, onRate }) {
  return (
    <div className="rating-stars" role="group" aria-label="Twoja ocena">
      {STAR_VALUES.map((star) => (
        <button
          key={star}
          className={value != null && star <= value ? 'rating-star is-on' : 'rating-star'}
          type="button"
          aria-label={`Oceń na ${star} z 5`}
          aria-pressed={value === star}
          disabled={disabled}
          onClick={() => onRate(star)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.2 14.6 8.8 20.8 9.4 16.2 13.6 17.6 19.8 12 16.8 6.4 19.8 7.8 13.6 3.2 9.4 9.4 8.8 Z"
              stroke="var(--ink-oak)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default RatingStars
