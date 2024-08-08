import type { AppError } from '@/api/error.ts'
import type { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import type { DoNode } from '@/store/node/do-node.ts'
import type { IFlow } from '@/types/flow.type.ts'
import type { NodeTypes } from '@/types/types.ts'

import { Effect, pipe } from 'effect'
import { action, makeObservable, observable } from 'mobx'

import { FlowDrawer } from '@/store/flow/flow-drawer.ts'
import { assignIf } from '@/store/utils/store.utils.ts'
import { customMerge } from '@/utils/custom-merge.ts'

export class DoFlow {
  store: DoFlowStore
  drawer: FlowDrawer

  title!: string
  parentFlowId: string | null = null
  childFlowIds: string[] | null = null
  childNodeIds: string[] | null = null

  snapshot!: IFlow

  constructor(store: DoFlowStore, data: IFlow) {
    this.store = store
    this.drawer = new FlowDrawer(this)

    this.merge(data)
    makeObservable(this, {
      childFlowIds: observable,
      childNodeIds: observable,
      merge: action,
      parentFlowId: observable,

      title: observable,
    })
  }

  get id() {
    return this.snapshot.flowId
  }

  merge(changedData: Partial<IFlow>) {
    this.snapshot = customMerge(this.snapshot, changedData)

    if (typeof changedData.created_at === 'string') {
      this.snapshot.created_at = new Date(changedData.created_at)
    }
    if (typeof changedData.updated_at === 'string') {
      this.snapshot.updated_at = new Date(changedData.updated_at)
    }

    assignIf(changedData, 'title', (title) => {
      this.title = title
    })
    assignIf(changedData, 'parentFlowId', (parentFlowId) => {
      this.parentFlowId = parentFlowId
    })
    assignIf(changedData, 'childFlowIds', (childFlowIds) => {
      this.childFlowIds = childFlowIds
    })
    assignIf(changedData, 'childNodeIds', (childNodeIds) => {
      this.childNodeIds = childNodeIds
    })

    return this
  }

  //
  // api
  //
  createChildFlow(flow: IFlow): Effect.Effect<DoFlow, AppError> {
    return pipe(
      this.store.createFlow({ flow }),
      Effect.flatMap((createdFlow) =>
        pipe(
          this.store.updateFlow({
            changedFlow: {
              childFlowIds: [
                ...(this.snapshot.childFlowIds ?? []),
                createdFlow.id,
              ],
            },
            flowId: this.id,
          }),
          Effect.map(() => createdFlow),
        ),
      ),
    )
  }
  createChildNode(node: NodeTypes): Effect.Effect<DoNode, AppError> {
    return pipe(
      this.store.rootStore.nodeStore.createNode(node),
      Effect.flatMap((createdNode) =>
        pipe(
          this.store.updateFlow({
            changedFlow: {
              childNodeIds: [
                ...(this.snapshot.childNodeIds ?? []),
                createdNode.id,
              ],
            },
            flowId: this.id,
          }),
          Effect.map(() => createdNode),
        ),
      ),
    )
  }
}
