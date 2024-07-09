import { useEffect } from 'react'

import { useStore } from '@/store/useStore.ts'

export const SiteDataLoader = () => {
  const store = useStore()

  useEffect(() => {
    store.initializeApp()
  }, [store])

  return null
}
