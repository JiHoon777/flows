import type React from 'react'

import { createPortal } from 'react-dom'

export function Portal({
  children,
}: React.PropsWithChildren): React.JSX.Element | null {
  return typeof document === 'object'
    ? createPortal(children, document.body)
    : null
}
