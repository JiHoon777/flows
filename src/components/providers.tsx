import type { PropsWithChildren } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: PropsWithChildren) {
  return <TooltipProvider>{children}</TooltipProvider>
}
