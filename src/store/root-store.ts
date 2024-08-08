import type { Apis } from '@/api/api.interface.ts'
import type { Platform } from '@tauri-apps/api/os'

import { platform as TauriPlatform } from '@tauri-apps/api/os'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { ApiFileSystem } from '@/api/api-file-system.ts'
import { formatUnknownErrorMessage } from '@/api/error.ts'
import { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import { DoNodeStore } from '@/store/node/do-node-store.ts'
import { ExplorerView } from '@/store/views/explorer-view.ts'

const isPrimitive = (value: any) =>
  value === null || (typeof value !== 'object' && typeof value !== 'function')

export class RootStore {
  private fontSizeStep: number = 1

  appLoaded: boolean = false
  failAppLoaded: boolean = false

  api: Apis
  flowStore: DoFlowStore
  nodeStore: DoNodeStore

  platform: Platform | null = null

  explorerView: ExplorerView

  constructor() {
    this.api = new ApiFileSystem()
    this.flowStore = new DoFlowStore(this)
    this.nodeStore = new DoNodeStore(this)

    // views
    this.explorerView = new ExplorerView(this)

    makeObservable(this, {
      appLoaded: observable,
      failAppLoaded: observable,

      initializeApp: action,
    })
  }

  get isMac() {
    return this.platform === 'darwin'
  }

  showError(ex: unknown) {
    const errorOrigin = isPrimitive(ex) ? ex : JSON.stringify(ex)
    console.error(
      `errorMessage: ${formatUnknownErrorMessage(ex)},\n\n errorOrigin: ${errorOrigin}`,
    )
  }

  changeFontSize(increase: boolean) {
    const currentFontSize = parseInt(
      getComputedStyle(document.documentElement).fontSize,
    )
    const newFontSize = increase
      ? currentFontSize + this.fontSizeStep
      : currentFontSize - this.fontSizeStep
    document.documentElement.style.fontSize = `${newFontSize}px`
  }

  /**
   * App 진입시 모든 플로우와, 노드들을 초기화한다.
   */
  async initializeApp(): Promise<void> {
    try {
      // Check and create directories
      await Promise.all([
        this.api.checkFlowDirectoryAndCreate(),
        this.api.checkNodeDirectoryAndCreate(),
      ])

      // Initialize platform
      const platform = await TauriPlatform()
      runInAction(() => {
        this.platform = platform
      })

      // Get all flows and nodes
      const [flows, nodes] = await Promise.all([
        this.api.getAllFlows(),
        this.api.getAllNodes(),
      ])

      // Merge flows and nodes into stores
      runInAction(() => {
        flows.forEach((flow) => this.flowStore.merge(flow))
        nodes.forEach((node) => this.nodeStore.merge(node))
      })

      // Set app as loaded
      runInAction(() => {
        this.appLoaded = true
      })
    } catch (error) {
      // Handle errors
      runInAction(() => {
        this.failAppLoaded = true
      })
      this.showError(error)
    }
  }
}
