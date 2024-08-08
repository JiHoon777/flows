import type { RootStore } from '@/store/root-store.ts'
import type { IFlow } from '@/types/flow.type.ts'

import { cloneDeep } from 'lodash-es'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { DoFlow } from '@/store/flow/do-flow.ts'

export class DoFlowStore {
  rootStore: RootStore

  flowsMap: Record<string, DoFlow> = {}

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore
    makeObservable(this, {
      flowsMap: observable,

      merge: action,
    })
  }

  //
  // getter
  //
  getFlowById(flowId: string) {
    return this.flowsMap[flowId]
  }

  //
  // action
  //
  merge(data: IFlow) {
    const existing = this.flowsMap[data.flowId]

    if (!existing) {
      this.flowsMap[data.flowId] = new DoFlow(this, data)
      return this.flowsMap[data.flowId]
    }

    return existing.merge(data)
  }

  //
  // api
  //

  /**
   * @return DoFlow
   * @throws Error
   */
  async createFlow({ flow }: { flow: IFlow }): Promise<DoFlow> {
    const createdFlow = this.merge(flow)

    try {
      await this.rootStore.api.createFlow(flow)

      return createdFlow
    } catch (ex) {
      runInAction(() => {
        delete this.flowsMap[flow.flowId]
      })

      throw ex
    }
  }

  /**
   * @return DoFlow
   * @throws Error
   */
  async updateFlow({
    flowId,
    changedFlow,
  }: {
    flowId: string
    changedFlow: Partial<IFlow>
  }): Promise<DoFlow> {
    const existing = this.flowsMap[flowId]

    if (!existing) {
      throw new Error('could not find flow')
    }

    const dataBeforeMerge = cloneDeep(existing.snapshot)
    existing.merge({ ...changedFlow, updated_at: new Date() })

    try {
      await this.rootStore.api.updateFlow(existing.snapshot)

      return existing
    } catch (ex) {
      runInAction(() => {
        existing.merge(dataBeforeMerge)
      })

      throw ex
    }
  }

  /**
   * flow 를 삭제하면, childNodes, childFlows 를 루트로 보낸다. 다 삭제하자니 좀 그렇자너~ 복잡해~
   * @throws Error
   */
  async removeFlow(flowId: string): Promise<void> {
    const deletedFlow = this.flowsMap[flowId]
    runInAction(() => {
      delete this.flowsMap[flowId]
    })

    for (const childFlowId of deletedFlow.childFlowIds ?? []) {
      const childFlow = this.flowsMap[childFlowId]

      if (childFlow) {
        childFlow.merge({ parentFlowId: null, targets: [] })
      }
    }

    for (const childNodeId of deletedFlow.childNodeIds ?? []) {
      const childNode = this.rootStore.nodeStore.nodesMap[childNodeId]

      if (childNode) {
        childNode.merge({ parentFlowId: null, targets: [] })
      }
    }

    try {
      await this.rootStore.api.deleteFlow(flowId)
    } catch (ex) {
      runInAction(() => {
        this.flowsMap[flowId] = deletedFlow
      })

      throw ex
    }
  }
}
