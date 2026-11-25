/** Wewnętrzna zawartość SVG strzałki (ten sam kształt co w markerze Leaflet). */
export const USER_LOCATION_ARROW_MARKUP = `<svg class="user-location-arrow-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L21 19.5 L12 15.2 L3 19.5 Z" fill="#ffffff" stroke="#111827" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 6.2 L17.2 17.2 L12 14.1 L6.8 17.2 Z" fill="#22C8FF"/></svg>`

function UserLocationArrowIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 L21 19.5 L12 15.2 L3 19.5 Z"
        fill="#ffffff"
        stroke="#111827"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M12 6.2 L17.2 17.2 L12 14.1 L6.8 17.2 Z" fill="#22C8FF" />
    </svg>
  )
}

export default UserLocationArrowIcon