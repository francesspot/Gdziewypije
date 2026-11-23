import { useState } from 'react'
import { register } from '../api'
import FormField from './FormField'

// Te same reguły co w backendzie (schemas/accounts.py), żeby błąd pojawił się przy polu przed wysłaniem
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MIN_PASSWORD_LENGTH = 8
const MIN_DISPLAY_NAME_LENGTH = 2

// Backend obcina spacje na początku i końcu każdego pola, także hasła, więc długość liczy się po trim()
function validate(email, password, displayName) {
  const errors = {}
  if (!email.trim()) {
    errors.email = 'Podaj e-mail'
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Podaj poprawny adres e-mail, np. jan@test.pl'
  }
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    errors.password = `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`
  }
  // PU.01 (3b): nazwa krótsza niż 2 znaki
  if (displayName.trim().length < MIN_DISPLAY_NAME_LENGTH) {
    errors.display_name = `Nazwa musi mieć co najmniej ${MIN_DISPLAY_NAME_LENGTH} znaki`
  }
  return errors
}

function RegisterForm({ onLoggedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validate(email, password, displayName)
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      // PU.01 (5): rejestracja zwraca token, więc użytkownik jest od razu zalogowany
      const session = await register(email.trim(), password, displayName.trim())
      onLoggedIn(session)
    } catch (err) {
      const fields = err.fields ?? {}
      if (err.status === 409) {
        // PU.01 (3a): e-mail jest już w bazie
        setFieldErrors({ email: err.message })
      } else if (Object.keys(fields).length > 0) {
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
      <FormField
        id="register-email"
        label="E-mail"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <FormField
        id="register-password"
        label={`Hasło (min. ${MIN_PASSWORD_LENGTH} znaków)`}
        type="password"
        autoComplete="new-password"
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <FormField
        id="register-display-name"
        label="Nazwa użytkownika"
        type="text"
        autoComplete="nickname"
        value={displayName}
        error={fieldErrors.display_name}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="account-submit" type="submit" disabled={submitting}>
        {submitting ? 'Zakładanie konta…' : 'Załóż konto'}
      </button>
    </form>
  )
}

export default RegisterForm
