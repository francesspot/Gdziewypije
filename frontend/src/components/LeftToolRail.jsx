import { GpsPinIcon, ListClipboardStarsIcon, TopPodiumIcon } from './icons'

function LeftToolRail({ navOpen, topOpen, listOpen, onToggleNav, onToggleTop, onToggleList }) {
  return (
    <nav className="left-tool-rail" aria-label="Narzędzia boczne">
      <button
        type="button"
        className={['left-tool-rail-btn', navOpen ? 'is-active' : ''].filter(Boolean).join(' ')}
        aria-pressed={navOpen}
        aria-label="Nawigacja"
        onClick={onToggleNav}
      >
        <GpsPinIcon />
      </button>
      <button
        type="button"
        className={['left-tool-rail-btn', listOpen ? 'is-active' : ''].filter(Boolean).join(' ')}
        aria-pressed={listOpen}
        aria-label="Lista"
        onClick={onToggleList}
      >
        <ListClipboardStarsIcon />
      </button>
      <button
        type="button"
        className={['left-tool-rail-btn', topOpen ? 'is-active' : '']
          .filter(Boolean)
          .join(' ')}
        aria-pressed={topOpen}
        aria-label="TOP"
        onClick={onToggleTop}
      >
        <TopPodiumIcon />
      </button>
    </nav>
  )
}

export default LeftToolRail
