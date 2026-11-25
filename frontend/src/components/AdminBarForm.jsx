import { useState } from 'react'
import { createBar, updateBar } from '../api'
import FormField from './FormField'

// Przecinek zamieniany na kropkę, bo po polsku współrzędne często wpisuje się jako 51,11
function parseCoordinate(text) {
  const value = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || Number.isNaN(value) ? null : value
}

// Formularz dodania (bar = null) albo edycji baru; edycja wysyła wszystkie pola, bo PUT zastępuje cały bar
function AdminBarForm({ bar, onSaved, onCancel }) {
  const [name, setName] = useState(bar?.name ?? '')
  const [address, setAddress] = useState(bar?.address ?? '')
  const [openingHours, setOpeningHours] = useState(bar?.opening_hours ?? '')
  const [latitude, setLatitude] = useState(bar ? String(bar.latitude) : '')
  const [longitude, setLongitude] = useState(bar ? String(bar.longitude) : '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const lat = parseCoordinate(latitude)
    const lon = parseCoordinate(longitude)
    // Te same zakresy co w BarRequest w backendzie
    const errors = {}
    if (!name.trim()) {
      errors.name = 'Podaj nazwę'
    }
    if (lat == null || lat < -90 || lat > 90) {
      errors.latitude = 'Podaj liczbę od -90 do 90'
    }
    if (lon == null || lon < -180 || lon > 180) {
      errors.longitude = 'Podaj liczbę od -180 do 180'
    }
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) {
      return
    }

    // Puste pole opcjonalne jest wysyłane jako null, żeby w bazie nie zapisał się pusty tekst
    const data = {
      name: name.trim(),
      address: address.trim() || null,
      opening_hours: openingHours.trim() || null,
      latitude: lat,
      longitude: lon,
    }
    setSubmitting(true)
    try {
      const saved = bar ? await updateBar(bar.id, data) : await createBar(data)
      onSaved(saved)
    } catch (err) {
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
      <h2 className="admin-form-title">{bar ? 'Edycja baru' : 'Nowy bar'}</h2>
      <FormField
        id="bar-name"
        label="Nazwa"
        autoFocus
        value={name}
        error={fieldErrors.name}
        onChange={(event) => setName(event.target.value)}
      />
      <FormField
        id="bar-address"
        label="Adres (opcjonalnie)"
        value={address}
        error={fieldErrors.address}
        onChange={(event) => setAddress(event.target.value)}
      />
      <FormField
        id="bar-opening-hours"
        label="Godziny otwarcia (opcjonalnie)"
        placeholder="Mo-Su 16:00-02:00"
        value={openingHours}
        error={fieldErrors.opening_hours}
        onChange={(event) => setOpeningHours(event.target.value)}
      />
      <div className="admin-form-row">
        <FormField
          id="bar-latitude"
          label="Szerokość geogr."
          inputMode="decimal"
          placeholder="51.11"
          value={latitude}
          error={fieldErrors.latitude}
          onChange={(event) => setLatitude(event.target.value)}
        />
        <FormField
          id="bar-longitude"
          label="Długość geogr."
          inputMode="decimal"
          placeholder="17.03"
          value={longitude}
          error={fieldErrors.longitude}
          onChange={(event) => setLongitude(event.target.value)}
        />
      </div>
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

export default AdminBarForm
