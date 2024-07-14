import { Platform, platform as TauriPlatform } from '@tauri-apps/api/os'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { fileSystemAPI } from '@/api/file-system.ts'
import { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import { DoNodeStore } from '@/store/node/do-node-store.ts'
import { ExplorerView } from '@/store/views/explorer-view.ts'

export class RootStore {
  appLoaded: boolean = false

  flowStore: DoFlowStore
  nodeStore: DoNodeStore

  platform: Platform | null = null

  explorerView: ExplorerView

  constructor() {
    this.flowStore = new DoFlowStore(this)
    this.nodeStore = new DoNodeStore(this)

    // views
    this.explorerView = new ExplorerView(this)

    makeObservable(this, {
      appLoaded: observable,

      initializeApp: action,
    })
  }

  get isMac() {
    return this.platform === 'darwin'
  }

  showError(ex: any) {
    console.error(ex)
  }

  /**
   * App 진입시 모든 플로우와, 노드들을 초기화한다.
   */
  async initializeApp() {
    TauriPlatform().then((res) => {
      this.platform = res
    })

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
