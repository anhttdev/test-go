import { useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from './toastContext'
import type { Toast, ToastContextValue } from './toastContext'
import { classNames } from '../lib/format'

function randomId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, number>())

  useEffect(() => {
    const currentTimers = timers.current
    return () => {
      for (const timer of currentTimers.values()) {
        window.clearTimeout(timer)
      }
      currentTimers.clear()
    }
  }, [])

  const api = useMemo<ToastContextValue>(() => {
    return {
      push: (toast) => {
        const id = randomId()
        setToasts((current) => [{ id, ...toast }, ...current].slice(0, 3))
        const timer = window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id))
          timers.current.delete(id)
        }, toast.type === 'error' ? 6500 : 4500)
        timers.current.set(id, timer)
      },
      clear: () => {
        setToasts([])
      },
    }
  }, [])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-label="Thông báo">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={classNames('toast', `toast-${toast.type}`)}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            {toast.title ? <div className="toast-title">{toast.title}</div> : null}
            <div className="toast-message">{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

