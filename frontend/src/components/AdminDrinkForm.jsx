import { useState } from 'react'
import { createDrink, updateDrink } from '../api'
import { DRINK_CATEGORIES } from '../drinkCategories'
import FormField from './FormField'

// Górna granica kolumny integer w bazie, ta sama co w DrinkRequest w backendzie
const MAX_VOLUME_ML = 2_147_483_647

// Formularz dodania (drink = null) albo edycji napoju; edycja wysyła wszystkie pola, bo PUT zastępuje cały napój
function AdminDrinkForm({ drink, onSaved, onCancel }) {
  const [name, setName] = useState(drink?.name ?? '')
  const [category, setCategory] = useState(drink?.category ?? 'beer')
  const [volume, setVolume] = useState(drink ? String(drink.volume_ml) : '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const volumeMl = Number(volume.trim())
    const errors = {}
    if (!name.trim()) {
      errors.name = 'Podaj nazwę'
    }
    if (volume.trim() === '' || !Number.isInteger(volumeMl) || volumeMl <= 0 || volumeMl > MAX_VOLUME_ML) {
      errors.volume_ml = 'Podaj pojemność w ml jako dodatnią liczbę całkowitą'
    }
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) {
      return
    }

    const data = { name: name.trim(), category, volume_ml: volumeMl }
    setSubmitting(true)
    try {
      const saved = drink ? await updateDrink(drink.id, data) : await createDrink(data)
      onSaved(saved)
    } catch (err) {
      // 422 trafia przy pola, a 409 (napój o tej nazwie i pojemności już jest) pod formularz
      const fields = err.fields ?? {}
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields)
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <h2 className="admin-form-title">{drink ? 'Edycja napoju' : 'Nowy napój'}</h2>
      <FormField
        id="drink-name"
        label="Nazwa"
        autoFocus
        value={name}
        error={fieldErrors.name}
        onChange={(event) => setName(event.target.value)}
      />
      {/* FormField obsługuje tylko input, więc lista kategorii ma własne pole w tym samym układzie */}
      <div className="form-field">
        <label htmlFor="drink-category">Kategoria</label>
        <select
          id="drink-category"
          value={category}
          aria-invalid={fieldErrors.category ? true : undefined}
          aria-describedby={fieldErrors.category ? 'drink-category-error' : undefined}
          onChange={(event) => setCategory(event.target.value)}
        >
          {Object.entries(DRINK_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fieldErrors.category ? (
          <p className="field-error" id="drink-category-error">
            {fieldErrors.category}
          </p>
        ) : null}
      </div>
      <FormField
        id="drink-volume"
        label="Pojemność (ml)"
        inputMode="numeric"
        placeholder="500"
        value={volume}
        error={fieldErrors.volume_ml}
        onChange={(event) => setVolume(event.target.value)}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-form-buttons">
        <button className="account-submit" type="submit" disabled={submitting}>
          {submitting ? 'Zapisywanie…' : 'Zapisz'}
        </button>
        <button className="account-submit admin-cancel" type="button" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </form>
  )
}

export default AdminDrinkForm
