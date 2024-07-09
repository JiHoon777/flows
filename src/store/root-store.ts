import { action, makeObservable, observable, runInAction } from 'mobx'

import { fileSystemAPI } from '@/api/file-system.ts'
import { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import { DoNodeStore } from '@/store/node/do-node-store.ts'

export class RootStore {
  appLoaded: boolean = false

  flowStore: DoFlowStore
  nodeStore: DoNodeStore

  constructor() {
    this.flowStore = new DoFlowStore(this)
    this.nodeStore = new DoNodeStore(this)

    makeObservable(this, {
      appLoaded: observable,

      initializeApp: action,
    })
  }

  showError(ex: any) {
    console.error(ex)
  }

  /**
   * App 진입시 모든 플로우와, 노드들을 초기화한다.
   */
  async initializeApp() {
    Promise.all([fileSystemAPI.loadAllFlows(), fileSystemAPI.loadAllNodes()])
      .then(([loadedFlows, loadedNodes]) => {
        loadedFlows.forEach((flow) => this.flowStore.merge(flow))
        loadedNodes.forEach((node) => this.nodeStore.merge(node))
      })
      .catch((ex) => {
        this.showError(ex)
      })
      .finally(() => {
        runInAction(() => {
          this.appLoaded = true
        })
      })
  }
}
