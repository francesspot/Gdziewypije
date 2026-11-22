import { useEffect, useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

function AccountPanel({ open, user, onClose, onLoggedIn, onLogout }) {
  const [mode, setMode] = useState('login')

  useEffect(() => {
    if (!open) {
      return
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="account-overlay"
      onClick={(event) => {
        // Zamyka tylko kliknięcie w tło, nie w samo okno
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className="account-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
      >
        <header className="account-header">
          <h1 id="account-title">Konto</h1>
          <button className="account-close" type="button" onClick={onClose} aria-label="Zamknij">
            ×
          </button>
        </header>
        {user ? (
          <>
            <p className="account-user">
              Zalogowano jako <strong>{user.display_name}</strong> ({user.email})
            </p>
            <button className="account-submit account-logout" type="button" onClick={onLogout}>
              Wyloguj się
            </button>
          </>
        ) : (
          <>
            <div className="account-tabs" role="group" aria-label="Logowanie lub rejestracja">
              <button
                className="account-tab"
                type="button"
                aria-pressed={mode === 'login'}
                onClick={() => setMode('login')}
              >
                Logowanie
              </button>
              <button
                className="account-tab"
                type="button"
                aria-pressed={mode === 'register'}
                onClick={() => setMode('register')}
              >
                Rejestracja
              </button>
            </div>
            {mode === 'login' ? (
              <LoginForm onLoggedIn={onLoggedIn} />
            ) : (
              <RegisterForm onLoggedIn={onLoggedIn} />
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default AccountPanel
