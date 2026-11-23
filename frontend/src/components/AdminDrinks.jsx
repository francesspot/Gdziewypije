import { useEffect, useState } from 'react'
import { getAdminDrinks, setDrinkActive } from '../api'
import { DRINK_CATEGORIES } from '../drinkCategories'
import AdminDrinkForm from './AdminDrinkForm'

// Ta sama kolejność co w GET /admin/drinks: po nazwie, pojemności i id
function compareDrinks(a, b) {
  return a.name.localeCompare(b.name, 'pl') || a.volume_ml - b.volume_ml || a.id - b.id
}

// Zakładka napojów w panelu administratora: wszystkie napoje, także wyłączone, z dodawaniem, edycją i wyłączaniem
function AdminDrinks() {
  const [drinks, setDrinks] = useState([])
  // null: widać listę, 'new': formularz nowego napoju, obiekt napoju: formularz edycji tego napoju
  const [editing, setEditing] = useState(null)
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

  function handleSaved(saved) {
    // Zapisany napój zastępuje starą wersję albo dochodzi jako nowy, a lista zostaje posortowana
    setDrinks((current) => [...current.filter((item) => item.id !== saved.id), saved].sort(compareDrinks))
    setEditing(null)
  }

  if (editing) {
    return (
      <AdminDrinkForm
        drink={editing === 'new' ? null : editing}
        onSaved={handleSaved}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <button className="account-submit" type="button" onClick={() => setEditing('new')}>
          Dodaj napój
        </button>
      </div>
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
              onClick={() => setEditing(drink)}
              aria-label={`Edytuj ${drink.name} ${drink.volume_ml} ml`}
            >
              Edytuj
            </button>
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
