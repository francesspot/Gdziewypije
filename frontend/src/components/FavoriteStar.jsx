// Ta sama gwiazdka na liście i w okienku baru, więc wygląd i opisy dla czytnika ekranu są w jednym miejscu.
function FavoriteStar({ barName, isFavorite, onToggle }) {
  return (
    <button
      className={isFavorite ? 'favorite-star is-on' : 'favorite-star'}
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Usuń ${barName} z ulubionych` : `Dodaj ${barName} do ulubionych`}
      onClick={onToggle}
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
  )
}

export default FavoriteStar
