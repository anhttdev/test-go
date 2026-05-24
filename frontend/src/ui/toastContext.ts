import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  type: ToastType
  title?: string
  message: string
}

export type ToastContextValue = {
  push: (toast: Omit<Toast, 'id'>) => void
  clear: () => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('ToastProvider chưa được gắn vào cây component.')
  }
  return value
}

