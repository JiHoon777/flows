import type { ButtonProps } from '@/components/ui/button.tsx'
import type { TooltipWrapProps } from '@/components/ui/tooltip.tsx'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button.tsx'
import { TooltipWrap } from '@/components/ui/tooltip.tsx'

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
