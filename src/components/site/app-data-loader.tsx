import { useEffect } from 'react'

import { useStore } from '@/store/useStore.ts'

export const AppDataLoader = () => {
  const store = useStore()

  useEffect(() => {
    store.initializeApp()
  }, [store])

  return null
}
