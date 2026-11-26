function GpsPinIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path
        d="M1 22 Q12 18.5 23 22 L23 24 Q12 21.5 1 24 Z"
        fill="var(--ink-oak)"
        fillOpacity="0.55"
      />
      <path
        d="M4.5 21.75 Q12 19.25 19.5 21.75"
        fill="none"
        stroke="var(--bg-foam)"
        strokeWidth="1.2"
        strokeDasharray="3 2"
        strokeLinecap="round"
      />
      <ellipse cx="12" cy="17.5" rx="3.5" ry="1" fill="var(--ink-oak)" fillOpacity="0.3" />
      <path
        d="M12 17 C8.5 12 6 9.25 6 7.25 C6 4.4 8.55 2 12 2 C15.45 2 18 4.4 18 7.25 C18 9.25 15.5 12 12 17 Z"
        fill="var(--accent-beer)"
      />
      <circle cx="12" cy="7.25" r="2.4" fill="var(--bg-foam)" />
    </svg>
  )
}

export default GpsPinIcon
