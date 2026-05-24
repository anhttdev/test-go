import { classNames } from '../lib/format'

export function Button({
  variant = 'default',
  size = 'md',
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
}) {
  return (
    <button
      {...props}
      className={classNames('btn', `btn-${variant}`, `btn-${size}`, className)}
      disabled={props.disabled || loading}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      <span className="btn-label">{props.children}</span>
    </button>
  )
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return <div {...props} className={classNames('card', className)} />
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="field">
      <div className="field-label-row">
        <span className="field-label">{label}</span>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
      {children}
      {error ? <div className="field-error">{error}</div> : null}
    </label>
  )
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames('input', className)} />
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={classNames('select', className)} />
}

