import { useEffect, useState } from 'react'
import { getDrinks } from '../api'
import FormField from './FormField'

// Kolumna prices.amount to numeric(8, 2), więc najwyżej 6 cyfr przed przecinkiem i 2 po nim
const AMOUNT_PATTERN = /^\d{1,6}([.,]\d{1,2})?$/

// Zwraca komunikat błędu albo pusty tekst; przecinek jest dozwolony, bo tak zapisuje się ceny po polsku
function validateAmount(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return 'Podaj cenę'
  }
  if (!AMOUNT_PATTERN.test(trimmed)) {
    return 'Podaj cenę w złotych, np. 12,50'
  }
  if (Number(trimmed.replace(',', '.')) <= 0) {
    return 'Cena musi być większa od 0'
  }
  return ''
}

// Pusta lista oznacza, że administrator wyłączył wszystkie napoje
function drinkPlaceholder(loading, count) {
  if (loading) {
    return 'Ładowanie…'
  }
  return count === 0 ? 'Brak napojów do wyboru' : 'Wybierz napój'
}

// Komponent dostaje key z wybranym napojem, więc „zmiana” przy innej cenie montuje go od nowa z tym napojem
function PriceReportForm({ initialDrinkId, onSubmit, onCancel }) {
  const [drinks, setDrinks] = useState([])
  const [drinksLoading, setDrinksLoading] = useState(true)
  const [drinkId, setDrinkId] = useState(initialDrinkId == null ? '' : String(initialDrinkId))
  const [amount, setAmount] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    getDrinks()
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
          setDrinksLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    // Klucze takie jak pola w API, żeby błędy 422 z backendu trafiały w to samo miejsce
    const errors = {}
    if (!drinkId) {
      errors.drink_id = 'Wybierz napój'
    }
    const amountError = validateAmount(amount)
    if (amountError) {
      errors.amount = amountError
    }
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(Number(drinkId), Number(amount.trim().replace(',', '.')))
    } catch (err) {
      // Błędy 422 trafiają przy pola, a pozostałe (np. 404 wyłączony napój) pod formularz
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
    <form className="price-report-form" onSubmit={handleSubmit} noValidate>
      {/* FormField obsługuje tylko <input>, więc lista napojów ma własne pole w tym samym stylu */}
      <div className="form-field">
        <label htmlFor="price-report-drink">Napój</label>
        <select
          id="price-report-drink"
          value={drinkId}
          disabled={drinksLoading}
          aria-invalid={fieldErrors.drink_id ? true : undefined}
          aria-describedby={fieldErrors.drink_id ? 'price-report-drink-error' : undefined}
          onChange={(event) => setDrinkId(event.target.value)}
        >
          <option value="">{drinkPlaceholder(drinksLoading, drinks.length)}</option>
          {drinks.map((drink) => (
            <option key={drink.id} value={drink.id}>
              {drink.name} {drink.volume_ml} ml
            </option>
          ))}
        </select>
        {fieldErrors.drink_id ? (
          <p className="field-error" id="price-report-drink-error">
            {fieldErrors.drink_id}
          </p>
        ) : null}
      </div>
      <FormField
        id="price-report-amount"
        label="Cena (zł)"
        type="text"
        inputMode="decimal"
        placeholder="np. 12,50"
        value={amount}
        error={fieldErrors.amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="price-report-actions">
        <button className="account-submit" type="submit" disabled={submitting || drinksLoading}>
          {submitting ? 'Zapisywanie…' : 'Zapisz cenę'}
        </button>
        <button className="price-report-cancel" type="button" onClick={onCancel}>
          anuluj
        </button>
      </div>
    </form>
  )
}

export default PriceReportForm
