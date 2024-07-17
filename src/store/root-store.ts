import { Platform, platform as TauriPlatform } from '@tauri-apps/api/os'
import { Effect, pipe } from 'effect'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { ApiFileSystem } from '@/api/api-file-system.ts'
import { Apis } from '@/api/api.interface.ts'
import { AppError } from '@/api/error.ts'
import { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import { DoNodeStore } from '@/store/node/do-node-store.ts'
import { ExplorerView } from '@/store/views/explorer-view.ts'

export class RootStore {
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

  showError(ex: AppError) {
    console.error(`${ex?.message ?? 'unknown message'}, ex: ${ex}`)
  }

  /**
   * App 진입시 모든 플로우와, 노드들을 초기화한다.
   */
  initializeApp() {
    const initializedEffect = pipe(
      Effect.all([
        this.api.checkFlowDirectoryAndCreate(),
        this.api.checkNodeDirectoryAndCreate(),
      ]),
      Effect.flatMap(() => Effect.promise(() => TauriPlatform())),
      Effect.tap((platform) =>
        Effect.sync(() => {
          runInAction(() => {
            this.platform = platform
          })
        }),
      ),
      Effect.flatMap(() =>
        Effect.all([this.api.getAllFlows(), this.api.getAllNodes()]),
      ),
      Effect.tap(([flows, nodes]) =>
        Effect.sync(() => {
          flows.forEach((flow) => this.flowStore.merge(flow))
          nodes.forEach((node) => this.nodeStore.merge(node))
        }),
      ),
      Effect.tapError((e) =>
        Effect.sync(() => {
          this.showError(e)
        }),
      ),
    )

    Effect.runPromise(initializedEffect)
      .then(() => {
        console.log('hi')
        runInAction(() => {
          this.appLoaded = true
        })
      })
      .catch((ex) => {
        runInAction(() => {
          this.failAppLoaded = true
        })
        this.showError(ex)
      })
  }
}
