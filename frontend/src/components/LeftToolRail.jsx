function LeftToolRail({ topOpen, listOpen, onToggleTop, onToggleList }) {
  return (
    <nav className="left-tool-rail" aria-label="Narzędzia boczne">
      <button
        type="button"
        className={['left-tool-rail-btn', topOpen ? 'is-active' : ''].filter(Boolean).join(' ')}
        aria-pressed={topOpen}
        aria-label={topOpen ? 'Zamknij TOP' : 'Otwórz TOP'}
        onClick={onToggleTop}
      >
        TOP
      </button>
      <button
        type="button"
        className={['left-tool-rail-btn', listOpen ? 'is-active' : ''].filter(Boolean).join(' ')}
        aria-pressed={listOpen}
        aria-label={listOpen ? 'Zamknij listę' : 'Otwórz listę'}
        onClick={onToggleList}
      >
        Lista
      </button>
    </nav>
  )
}

export default LeftToolRail