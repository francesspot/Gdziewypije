function LocateCrosshairIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 5 V8 M12 16 V19 M5 12 H8 M16 12 H19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default LocateCrosshairIcon