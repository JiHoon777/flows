import React from 'react'

import ReactDOM from 'react-dom/client'

import { AppRoutes } from '@/app-routes.tsx'
import { Providers } from '@/providers.tsx'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <AppRoutes />
    </Providers>
  </React.StrictMode>,
)
