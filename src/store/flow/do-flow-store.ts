import { cloneDeep } from 'lodash-es'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { fileSystemAPI } from '@/api/file-system.ts'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { RootStore } from '@/store/root-store.ts'
import { Flow, FlowNodeData } from '@/store/types.ts'

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
  merge(data: Flow) {
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

  async createFlow({ flow }: { flow: Flow }): Promise<DoFlow> {
    const createdFlow = this.merge(flow)

    try {
      await fileSystemAPI.saveFlowToFile(flow)

      return createdFlow
    } catch (ex) {
      runInAction(() => {
        delete this.flowsMap[flow.flowId]
      })

      throw ex
    }
  }

  async updateFlow({
    flowId,
    changedFlow,
  }: {
    flowId: string
    changedFlow: Partial<Omit<Flow, 'data'>> & {
      data?: Partial<FlowNodeData>
    }
  }): Promise<DoFlow> {
    const existing = this.flowsMap[flowId]

    if (!existing) {
      throw new Error('could not find flow')
    }

    // todo: cloneDeep 말고
    const dataBeforeMerge = cloneDeep(existing.data)
    existing.merge({ ...changedFlow, updated_at: new Date() })

    try {
      await fileSystemAPI.saveFlowToFile(existing.data)

      return existing
    } catch (ex) {
      existing.merge(dataBeforeMerge)
      throw ex
    }
  }
}
