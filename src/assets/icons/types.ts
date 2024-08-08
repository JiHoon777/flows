import type { PropsWithChildren, SVGProps } from 'react'
import type React from 'react'

export interface CustomSVGProps
  extends Omit<SVGProps<SVGSVGElement>, 'onClick'>,
    PropsWithChildren {
  size?: number
  title?: string
  action?: boolean
  onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
}
