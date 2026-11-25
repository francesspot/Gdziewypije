import { useEffect, useState } from 'react'
import { getBar } from '../api'
import FavoriteStar from './FavoriteStar'
import PriceReportForm from './PriceReportForm'
import RatingStars from './RatingStars'

function formatRating(avgRating) {
  return avgRating == null ? 'brak ocen' : avgRating.toFixed(1)
}

function formatPrice(amount) {
  return `${amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`
}

const CONFIRM_MESSAGES = {
  confirm: 'Cena potwierdzona (+1 pkt)',
  change: 'Zapisano zgłoszenie zmiany ceny. Podaj nową cenę poniżej.',
}

// Komponent dostaje key={barId}, więc wybór innego baru montuje go od nowa ze stanem ładowania.
function BarPopup({
  barId,
  isFavorite,
  barsVersion,
  onToggleFavorite,
  onRate,
  onConfirmPrice,
  onReportPrice,
  onNavigateToBar,
  onClose,
}) {
  const [bar, setBar] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // Backend nie zwraca własnej oceny użytkownika, więc podświetlona jest tylko ocena wystawiona w tym okienku
  const [myRating, setMyRating] = useState(null)
  const [ratingSaving, setRatingSaving] = useState(false)
  const [ratingError, setRatingError] = useState('')
  // Id ceny w trakcie zapisu; blokuje jej przyciski, żeby dwa kliknięcia nie wysłały dwóch potwierdzeń
  const [confirmingPriceId, setConfirmingPriceId] = useState(null)
  // Wspólne komunikaty potwierdzenia i zgłoszenia ceny, bo dotyczą tej samej listy cen
  const [priceMessage, setPriceMessage] = useState('')
  const [priceError, setPriceError] = useState('')
  // null to zamknięty formularz, a { drinkId } otwarty; drinkId jest ustawiony po kliknięciu „zmiana”
  const [reportForm, setReportForm] = useState(null)

  useEffect(() => {
    let cancelled = false

    // Dane z GET /bars/{id}, a nie z listy na mapie, żeby okienko pokazywało aktualny stan z backendu (WF.02).
    getBar(barId)
      .then((data) => {
        if (!cancelled) {
          setBar(data)
          setError('')
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
    // barsVersion rośnie po zapisaniu oceny, więc okienko pobiera nową średnią
  }, [barId, barsVersion])

  // Komunikat sukcesu znika po chwili tak jak błąd ulubionych w App; błędy zostają do kolejnej akcji
  useEffect(() => {
    if (!priceMessage) {
      return
    }
    const timer = setTimeout(() => setPriceMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [priceMessage])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  async function handleRate(value) {
    setRatingSaving(true)
    setRatingError('')
    try {
      if (await onRate(barId, value)) {
        setMyRating(value)
      }
    } catch (err) {
      setRatingError(err.message)
    } finally {
      setRatingSaving(false)
    }
  }

  async function handleConfirmPrice(price, kind) {
    setConfirmingPriceId(price.price_id)
    setPriceMessage('')
    setPriceError('')
    try {
      if (await onConfirmPrice(price.price_id, kind)) {
        setPriceMessage(CONFIRM_MESSAGES[kind])
        // PU.03: po „zmiana” nowa cena jest zgłaszana jak każda inna (T2), więc formularz ma już wybrany napój
        if (kind === 'change') {
          setReportForm({ drinkId: price.drink_id })
        }
      }
    } catch (err) {
      // 409 ma gotowy komunikat z backendu: „Ta cena została już potwierdzona z tego konta”
      setPriceError(err.message)
    } finally {
      setConfirmingPriceId(null)
    }
  }

  // Błędy nie są tu łapane, bo formularz pokazuje je przy polach albo pod sobą
  async function handleReportPrice(drinkId, amount) {
    setPriceMessage('')
    setPriceError('')
    if (await onReportPrice(barId, drinkId, amount)) {
      setReportForm(null)
      setPriceMessage('Cena zapisana (+5 pkt)')
    }
  }

  return (
    <section className="bar-popup" aria-label={bar ? `Bar ${bar.name}` : 'Szczegóły baru'}>
      <header className="bar-popup-header">
        <h2>{bar ? bar.name : 'Bar'}</h2>
        {bar ? (
          <FavoriteStar
            barName={bar.name}
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(barId)}
          />
        ) : null}
        <button className="bar-popup-close" type="button" onClick={onClose} aria-label="Zamknij okienko baru">
          ×
        </button>
      </header>
      {loading ? (
        <p className="bar-popup-status" role="status">
          Ładowanie…
        </p>
      ) : null}
      {error ? (
        <p className="bar-popup-error" role="alert">
          {error}
        </p>
      ) : null}
      {bar ? (
        <p className="bar-popup-rating">
          <span className="bar-popup-rating-value">Ocena: {formatRating(bar.avg_rating)}</span>
          <span className="bar-popup-rating-count">liczba ocen: {bar.ratings_count}</span>
        </p>
      ) : null}
      {bar ? (
        <div className="bar-popup-your-rating">
          <span>Twoja ocena:</span>
          <RatingStars value={myRating} disabled={ratingSaving} onRate={handleRate} />
        </div>
      ) : null}
      {ratingError ? (
        <p className="bar-popup-error" role="alert">
          {ratingError}
        </p>
      ) : null}
      {bar ? (
        <>
          <h3 className="bar-popup-prices-title">Ceny</h3>
          {/* Pusta lista z backendu oznacza bar bez cen (WF.04). */}
          {bar.prices.length === 0 ? (
            <p className="bar-popup-no-prices">brak danych</p>
          ) : (
            <ul className="bar-popup-prices">
              {bar.prices.map((price) => (
                <li key={price.price_id}>
                  <span className="bar-popup-drink">
                    {price.drink_name} {price.volume_ml} ml
                  </span>
                  <span className="bar-popup-amount">{formatPrice(price.amount)}</span>
                  {/* needs_verification liczy backend: brak potwierdzenia od 90 dni. */}
                  {price.needs_verification ? (
                    <span className="bar-popup-verify">do weryfikacji</span>
                  ) : null}
                  {/* PU.03: „zgadza się” odświeża datę ceny, „zmiana” zgłasza, że cena jest inna */}
                  <span className="bar-popup-confirm">
                    <button
                      type="button"
                      disabled={confirmingPriceId === price.price_id}
                      onClick={() => handleConfirmPrice(price, 'confirm')}
                      aria-label={`Cena ${price.drink_name} ${price.volume_ml} ml zgadza się`}
                    >
                      zgadza się
                    </button>
                    <button
                      type="button"
                      disabled={confirmingPriceId === price.price_id}
                      onClick={() => handleConfirmPrice(price, 'change')}
                      aria-label={`Cena ${price.drink_name} ${price.volume_ml} ml jest inna`}
                    >
                      zmiana
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {priceMessage ? (
            <p className="bar-popup-message" role="status">
              {priceMessage}
            </p>
          ) : null}
          {priceError ? (
            <p className="bar-popup-error" role="alert">
              {priceError}
            </p>
          ) : null}
          {reportForm ? (
            <PriceReportForm
              key={reportForm.drinkId ?? 'new'}
              initialDrinkId={reportForm.drinkId}
              onSubmit={handleReportPrice}
              onCancel={() => setReportForm(null)}
            />
          ) : (
            <div className="bar-popup-actions">
              <button
                className="bar-popup-report"
                type="button"
                onClick={() => setReportForm({ drinkId: null })}
              >
                zgłoś cenę
              </button>
              <button
                className="bar-popup-nav sketch-button"
                type="button"
                onClick={() =>
                  onNavigateToBar({
                    id: bar.id,
                    name: bar.name,
                    latitude: bar.latitude,
                    longitude: bar.longitude,
                  })
                }
              >
                Nawigacja
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}

export default BarPopup
