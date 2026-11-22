// Pole formularza z etykietą i błędem pod spodem; aria-describedby łączy błąd z polem dla czytnika ekranu
function FormField({ id, label, error, ...inputProps }) {
  const errorId = `${id}-error`
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default FormField
