import { TooltipProvider } from '@/components/ui/tooltip'
import { PropsWithChildren } from 'react'

export function Providers({ children }: PropsWithChildren) {
  return <TooltipProvider>{children}</TooltipProvider>
}
