import type { RootStore } from '@/store/root-store.ts'

import { makeObservable, observable } from 'mobx'

export class TransactionManager {
  rootStore: RootStore

  undoStack: any[] = []
  redoStack: any[] = []

  apiQueue: any[] = []

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore

    makeObservable(this, {
      apiQueue: observable,
    })
  }
}
