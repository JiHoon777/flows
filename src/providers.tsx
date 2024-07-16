// eslint-disable-next-line react-refresh/only-export-components
import { PropsWithChildren } from 'react'

import { APIOptions, PrimeReactProvider } from 'primereact/api'
import Tailwind from 'primereact/passthrough/tailwind'
import { BrowserRouter } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'

import { OverlayProvider } from '@/contexts/overlay/overlay-provider.tsx'
import { ThemeProvider } from '@/contexts/theme-provider.tsx'

const PrimeReactProviderValue: Partial<APIOptions> = {
  unstyled: true,
  ripple: true,
  pt: Tailwind,
  ptOptions: {
    mergeSections: true,
    mergeProps: true,
    classNameMergeFunction: twMerge,
  },
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <OverlayProvider>
        <ThemeProvider defaultTheme={'dark'} storageKey={'vite-ui-theme'}>
          <PrimeReactProvider value={PrimeReactProviderValue}>
            {children}
          </PrimeReactProvider>
        </ThemeProvider>
      </OverlayProvider>
    </BrowserRouter>
  )
}
