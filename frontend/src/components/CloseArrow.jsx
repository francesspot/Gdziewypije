function CloseArrow({ direction = 'right' }) {
  return (
    <svg
      className={direction === 'left' ? 'close-arrow close-arrow-left' : 'close-arrow'}
      viewBox="0 0 120 64"
      aria-hidden="true"
    >
      <path
        d="M 16 8 C 42 7, 82 7, 104 9 C 113 10, 115 18, 114 32 C 113 46, 112 54, 102 55 C 76 57, 38 56, 16 55 C 7 54, 6 45, 6 31 C 6 17, 8 9, 16 8 Z"
        fill="none"
        stroke="var(--ink-oak)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 17 39 C 42 29, 72 26, 99 38"
        fill="none"
        stroke="var(--ink-oak)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 16 36 C 24 33, 32 31, 40 30"
        fill="none"
        stroke="var(--ink-oak)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 85 26 L 101 38 L 83 43"
        fill="none"
        stroke="var(--ink-oak)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default CloseArrow
