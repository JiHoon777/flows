import type { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import type { DoNode } from '@/store/node/do-node.ts'
import type { IFlow } from '@/types/flow.type.ts'
import type { NodeTypes } from '@/types/types.ts'

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
  /**
   * @throws Error
   */
  async createChildFlow(flow: IFlow): Promise<DoFlow> {
    const createdFlow = await this.store.createFlow({ flow })

    await this.store.updateFlow({
      changedFlow: {
        childFlowIds: [...(this.snapshot.childFlowIds ?? []), createdFlow.id],
      },
      flowId: this.id,
    })

    return createdFlow
  }
  /**
   * @throws Error
   */
  async createChildNode(node: NodeTypes): Promise<DoNode> {
    const createdNode = await this.store.rootStore.nodeStore.createNode(node)

    await this.store.updateFlow({
      changedFlow: {
        childNodeIds: [...(this.snapshot.childNodeIds ?? []), createdNode.id],
      },
      flowId: this.id,
    })

    return createdNode
  }
}
