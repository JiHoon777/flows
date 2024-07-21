import { Effect, pipe } from 'effect'
import { cloneDeep } from 'lodash-es'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { AppError, ClientError } from '@/api/error.ts'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { RootStore } from '@/store/root-store.ts'
import { IFlow } from '@/types/flow.type.ts'

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

  createFlow({
    flow,
  }: {
    flow: IFlow
  }): Effect.Effect<DoFlow, AppError, never> {
    const createdFlow = this.merge(flow)

    return pipe(
      this.rootStore.api.createFlow(flow),
      Effect.map(() => createdFlow),
      Effect.catchAll((e) =>
        pipe(
          Effect.sync(() => {
            runInAction(() => {
              delete this.flowsMap[flow.flowId]
            })
          }),
          Effect.flatMap(() => Effect.fail(e)),
        ),
      ),
    )
  }

  updateFlow({
    flowId,
    changedFlow,
  }: {
    flowId: string
    changedFlow: Partial<IFlow>
  }): Effect.Effect<DoFlow, AppError, never> {
    const existing = this.flowsMap[flowId]

    if (!existing) {
      return Effect.fail(new ClientError('could not find flow'))
    }

    const dataBeforeMerge = cloneDeep(existing.snapshot)
    existing.merge({ ...changedFlow, updated_at: new Date() })

    return pipe(
      this.rootStore.api.updateFlow(existing.snapshot),
      Effect.map(() => existing),
      Effect.catchAll((e) =>
        pipe(
          Effect.sync(() => {
            runInAction(() => {
              existing.merge(dataBeforeMerge)
            })
          }),
          Effect.flatMap(() => Effect.fail(e)),
        ),
      ),
    )
  }

  /**
   * flow 를 삭제하면, childNodes, childFlows 를 루트로 보낸다. 다 삭제하자니 좀 그렇자너~ 복잡해~
   */
  removeFlow(flowId: string): Effect.Effect<void, AppError> {
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

    return pipe(
      this.rootStore.api.deleteFlow(flowId),
      Effect.catchAll((err) =>
        pipe(
          Effect.sync(() => {
            runInAction(() => {
              this.flowsMap[flowId] = deletedFlow
            })
          }),
          Effect.flatMap(() => Effect.fail(err)),
        ),
      ),
    )
  }
}
