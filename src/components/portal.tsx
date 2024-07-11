import type React from 'react'

import { createPortal } from 'react-dom'

export function Portal({
  children,
  containerEl = document.body,
}: {
  containerEl?: HTMLElement
} & React.PropsWithChildren): React.JSX.Element | null {
  return typeof document === 'object'
    ? createPortal(children, containerEl)
    : null
}
