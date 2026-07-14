import { useMemo } from 'react'
import { useAuth } from '../features/auth/auth-context'
import { ForbiddenPage } from '../pages/ForbiddenPage'

export function RequirePermission({
  anyOf,
  children,
}: {
  anyOf: string[]
  children: React.ReactNode
}) {
  const auth = useAuth()
  const ok = useMemo(() => auth.hasAnyPermission(anyOf), [auth, anyOf])

  if (!ok) {
    return <ForbiddenPage />
  }

  return children
}

