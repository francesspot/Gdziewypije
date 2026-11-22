import { useState } from 'react'
import { login } from '../api'
import FormField from './FormField'

function LoginForm({ onLoggedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = {}
    if (!email.trim()) {
      errors.email = 'Podaj e-mail'
    }
    if (!password) {
      errors.password = 'Podaj hasło'
    }
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      const session = await login(email.trim(), password)
      onLoggedIn(session)
    } catch (err) {
      // Błędy 422 trafiają przy pola, a pozostałe (np. 401 złe hasło) pod formularz
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
    // noValidate wyłącza dymki przeglądarki, żeby błędy były pokazane przy polach
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <FormField
        id="login-email"
        label="E-mail"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <FormField
        id="login-password"
        label="Hasło"
        type="password"
        autoComplete="current-password"
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="account-submit" type="submit" disabled={submitting}>
        {submitting ? 'Logowanie…' : 'Zaloguj się'}
      </button>
    </form>
  )
}

export default LoginForm
