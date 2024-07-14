import React from 'react'

import App from './App.tsx'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import { Toaster } from '@/components/ui/toaster.tsx'
import { OverlayProvider } from '@/contexts/overlay/overlay-provider.tsx'
import { ThemeProvider } from '@/contexts/theme-provider.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <OverlayProvider>
        <ThemeProvider defaultTheme={'dark'} storageKey={'vite-ui-theme'}>
          <App />
        </ThemeProvider>
        <Toaster />
      </OverlayProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
