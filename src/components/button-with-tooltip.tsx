import { ReactNode } from 'react'

import { Button, ButtonProps } from '@/components/ui/button.tsx'
import { TooltipWrap, TooltipWrapProps } from '@/components/ui/tooltip.tsx'

export const ButtonWithTooltip = ({
  tooltipContent,
  side,
  sideOffset,
  ...buttonProps
}: ButtonProps &
  Pick<TooltipWrapProps, 'side' | 'sideOffset'> & {
    tooltipContent: ReactNode
  }) => {
  return (
    <TooltipWrap
      side={side}
      sideOffset={sideOffset}
      content={tooltipContent}
      asChild
    >
      <Button {...buttonProps} />
    </TooltipWrap>
  )
}
