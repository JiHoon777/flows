import { createContext, useContext } from 'react'

import { RootStore } from '@/store/root-store.ts'

const store = new RootStore()
const storeContext = createContext(store)

export const useStore = (): RootStore => useContext(storeContext)
