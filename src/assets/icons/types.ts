import React, { PropsWithChildren, SVGProps } from 'react'

export interface CustomSVGProps
  extends Omit<SVGProps<SVGSVGElement>, 'onClick'>,
    PropsWithChildren {
  size?: number
  title?: string
  action?: boolean
  onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
}
