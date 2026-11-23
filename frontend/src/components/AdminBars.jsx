import { useEffect, useState } from 'react'
import { getAdminBars, setBarActive } from '../api'

// Zakładka barów w panelu administratora: wszystkie bary, także wyłączone, z wyłączaniem i włączaniem
function AdminBars() {
  const [bars, setBars] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Id baru, dla którego trwa zapis, żeby nie wysłać drugiego kliknięcia
  const [savingId, setSavingId] = useState(null)
  const normalized = query.trim().toLowerCase()
  const visibleBars = bars.filter((bar) => bar.name.toLowerCase().includes(normalized))

  useEffect(() => {
    let cancelled = false

    getAdminBars()
      .then((data) => {
        if (!cancelled) {
          setBars(data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function toggleActive(bar) {
    setSavingId(bar.id)
    setError('')
    try {
      const updated = await setBarActive(bar.id, !bar.is_active)
      setBars((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="admin-section">
      <label className="search">
        <span className="sr-only">Wyszukaj bar</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Wyszukaj bar"
        />
      </label>
      {loading ? (
        <p className="list-status" role="status">
          Ładowanie…
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && visibleBars.length === 0 ? <p className="list-status">Brak barów</p> : null}
      <ul className="admin-list">
        {visibleBars.map((bar) => (
          <li key={bar.id} className={bar.is_active ? 'admin-row' : 'admin-row is-inactive'}>
            <div className="admin-row-text">
              <span className="admin-row-name">{bar.name}</span>
              <span className="admin-row-meta">
                {bar.address ?? 'brak adresu'}
                {bar.is_active ? '' : ' · wyłączony'}
              </span>
            </div>
            <button
              className="admin-action"
              type="button"
              disabled={savingId === bar.id}
              onClick={() => toggleActive(bar)}
              aria-label={bar.is_active ? `Wyłącz ${bar.name}` : `Włącz ${bar.name}`}
            >
              {bar.is_active ? 'Wyłącz' : 'Włącz'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AdminBars
