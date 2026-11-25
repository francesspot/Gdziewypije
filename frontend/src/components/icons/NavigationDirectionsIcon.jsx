function NavigationDirectionsIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      {/* Menu (nagłówek panelu) */}
      <path
        d="M2.5 3.8 H8.5 M2.5 6.3 H8.5 M2.5 8.8 H8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      {/* Punkt startu */}
      <circle
        cx="5.2"
        cy="12.2"
        r="2.1"
        fill="var(--accent-beer)"
        stroke="currentColor"
        strokeWidth="1"
      />
      {/* Odcinek przerywany */}
      <path
        d="M5.2 14.6 V16.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.2 1.6"
      />
      {/* Cel (pinezka) */}
      <path
        d="M5.2 19.6 C5.2 17.9 6.5 17 7.35 17 C8.2 17 9.5 17.9 9.5 19.6 C9.5 21.5 7.35 22.6 7.35 22.6 C7.35 22.6 5.2 21.5 5.2 19.6 Z"
        fill="var(--accent-brick)"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Pola wyszukiwania (pigułki) */}
      <rect
        x="10.2"
        y="10.2"
        width="9.2"
        height="3.35"
        rx="1.675"
        fill="var(--bg-coaster)"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <rect
        x="10.2"
        y="15.5"
        width="9.2"
        height="3.35"
        rx="1.675"
        fill="var(--bg-coaster)"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      {/* Zamiana tras */}
      <path
        d="M20.8 11.8 L22.6 13.6 L20.8 15.4 M22.6 13.6 H19.2 M20.8 17.2 L18.9 15.4 L20.8 13.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default NavigationDirectionsIcon