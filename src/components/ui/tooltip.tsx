import * as React from 'react'
import { PropsWithChildren } from 'react'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/utils/cn'

export const TooltipProvider = TooltipPrimitive.Provider

const Tooltip_ = TooltipPrimitive.Root

const TooltipTrigger_ = TooltipPrimitive.Trigger

const TooltipContent_ = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
))

export const TooltipWrap = ({
  className,
  sideOffset = 4,
  children,
  content,
  asChild,
  side,
}: PropsWithChildren &
  Pick<
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    'sideOffset' | 'content' | 'side' | 'className'
  > & {
    asChild?: boolean
  }) => {
  return (
    <Tooltip_>
      <TooltipTrigger_ asChild={asChild}>{children}</TooltipTrigger_>
      <TooltipContent_
        sideOffset={sideOffset}
        className={className}
        side={side}
      >
        {content}
      </TooltipContent_>
    </Tooltip_>
  )
}
