import { computed, makeObservable, observable, runInAction } from 'mobx'
import { nanoid } from 'nanoid'

import { RootStore } from '@/store/root-store.ts'

export type ExplorerSortOption =
  | 'Created time asc'
  | 'Created time desc'
  | 'Updated time asc'
  | 'Updated time desc'
  | 'Title a to z'
  | 'Title z to a'

export class ExplorerView {
  rootStore: RootStore

  sortOption: ExplorerSortOption = 'Created time asc'
  isExpandAll: boolean = false
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore

    makeObservable(this, {
      sortOption: observable,
      isExpandAll: observable,

      explorerList: computed,
    })
  }

  //
  // get
  //
  get flowStore() {
    return this.rootStore.flowStore
  }

  get explorerList() {
    return Object.values(this.flowStore.flowsMap).filter(
      (flow) => !flow.parentFlowId,
    )
  }

  //
  // action
  //
  createFlowOnRoot() {
    this.flowStore.createFlow({
      flow: {
        flowId: nanoid(),
        created_at: new Date(),
        updated_at: new Date(),
        childNodeIds: [],
        data: {
          title: 'Untitled',
        },
      },
    })
  }

  setSortOption(changedOption: ExplorerSortOption) {
    runInAction(() => {
      this.sortOption = changedOption
    })
  }

  toggleIsExpandAll() {
    runInAction(() => {
      this.isExpandAll = !this.isExpandAll
    })
  }
}
