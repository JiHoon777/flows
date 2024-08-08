import type { JSX } from 'react'

export type CreateOverlayElement = (props: {
  isOpen: boolean
  close: () => void
  exit: () => void
}) => JSX.Element
