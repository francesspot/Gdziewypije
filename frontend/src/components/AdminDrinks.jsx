import { useEffect, useState } from 'react'
import { getAdminDrinks, setDrinkActive } from '../api'
import { DRINK_CATEGORIES } from '../drinkCategories'

// Zakładka napojów w panelu administratora: wszystkie napoje, także wyłączone, z wyłączaniem i włączaniem
function AdminDrinks() {
  const [drinks, setDrinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Id napoju, dla którego trwa zapis, żeby nie wysłać drugiego kliknięcia
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    getAdminDrinks()
      .then((data) => {
        if (!cancelled) {
          setDrinks(data)
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

  async function toggleActive(drink) {
    setSavingId(drink.id)
    setError('')
    try {
      const updated = await setDrinkActive(drink.id, !drink.is_active)
      setDrinks((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="admin-section">
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
      {!loading && !error && drinks.length === 0 ? <p className="list-status">Brak napojów</p> : null}
      <ul className="admin-list">
        {drinks.map((drink) => (
          <li key={drink.id} className={drink.is_active ? 'admin-row' : 'admin-row is-inactive'}>
            <div className="admin-row-text">
              <span className="admin-row-name">
                {drink.name} {drink.volume_ml} ml
              </span>
              <span className="admin-row-meta">
                {DRINK_CATEGORIES[drink.category] ?? drink.category}
                {drink.is_active ? '' : ' · wyłączony'}
              </span>
            </div>
            <button
              className="admin-action"
              type="button"
              disabled={savingId === drink.id}
              onClick={() => toggleActive(drink)}
              aria-label={
                drink.is_active
                  ? `Wyłącz ${drink.name} ${drink.volume_ml} ml`
                  : `Włącz ${drink.name} ${drink.volume_ml} ml`
              }
            >
              {drink.is_active ? 'Wyłącz' : 'Włącz'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AdminDrinks
