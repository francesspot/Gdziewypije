function TopPodiumIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12,1.5 13.3,4.2 16.2,4.6 14.1,6.6 14.6,9.5 12,8.1 9.4,9.5 9.9,6.6 7.8,4.6 10.7,4.2" />
      <path d="M2 22V14.5H8.5V11H15.5V16H22V22H2Z" />
      <line x1="2" y1="16" x2="8.5" y2="16" />
      <line x1="8.5" y1="12.5" x2="15.5" y2="12.5" />
      <line x1="15.5" y1="17.5" x2="22" y2="17.5" />
      <text x="5.2" y="20.4" fontSize="4.4" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="600">
        2
      </text>
      <text x="12" y="17.2" fontSize="4.6" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="600">
        1
      </text>
      <text x="18.8" y="21" fontSize="4.4" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="600">
        3
      </text>
    </svg>
  )
}

export default TopPodiumIcon