import { useEffect, useState } from 'react'
import AdminBars from './AdminBars'
import AdminDrinks from './AdminDrinks'

// WF.18: okno administratora z zakładkami barów i napojów; App renderuje je tylko dla roli admin
function AdminPanel({ open, onClose }) {
  const [tab, setTab] = useState('bars')

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
        className="account-panel admin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
      >
        <header className="account-header">
          <h1 id="admin-title">Panel administratora</h1>
          <button className="account-close" type="button" onClick={onClose} aria-label="Zamknij">
            ×
          </button>
        </header>
        <div className="account-tabs" role="group" aria-label="Bary lub napoje">
          <button
            className="account-tab"
            type="button"
            aria-pressed={tab === 'bars'}
            onClick={() => setTab('bars')}
          >
            Bary
          </button>
          <button
            className="account-tab"
            type="button"
            aria-pressed={tab === 'drinks'}
            onClick={() => setTab('drinks')}
          >
            Napoje
          </button>
        </div>
        {tab === 'bars' ? <AdminBars /> : <AdminDrinks />}
      </section>
    </div>
  )
}

export default AdminPanel
