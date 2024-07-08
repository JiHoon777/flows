import { useEffect } from 'react'

import { useStore } from '@/store/store'

export const SiteDataLoader = () => {
  const initialize = useStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return null
}
