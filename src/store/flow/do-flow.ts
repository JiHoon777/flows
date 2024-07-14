import { merge } from 'lodash-es'
import { action, makeObservable, observable } from 'mobx'

import { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import { FlowDrawer } from '@/store/flow/flow-drawer.ts'
import { Flow, FlowNodeData, NodeTypes } from '@/store/types.ts'
import { assignIf } from '@/store/utils/store.utils.ts'

export class DoFlow {
  store: DoFlowStore
  drawer: FlowDrawer

  title!: string
  parentFlowId: string | null = null
  childFlowIds: string[] | null = null
  childNodeIds: string[] | null = null

  snapshot!: Flow

  constructor(store: DoFlowStore, data: Flow) {
    this.store = store
    this.drawer = new FlowDrawer(this)

    this.merge(data)
    makeObservable(this, {
      title: observable,
      parentFlowId: observable,
      childFlowIds: observable,
      childNodeIds: observable,

      merge: action,
    })
  }

  get id() {
    return this.snapshot.flowId
  }

  merge(
    changedData: Partial<Omit<Flow, 'data'>> & {
      data?: Partial<FlowNodeData>
    },
  ) {
    this.snapshot = merge({}, this.snapshot, changedData)

    if (typeof changedData.created_at === 'string') {
      this.snapshot.created_at = new Date(changedData.created_at)
    }
    if (typeof changedData.updated_at === 'string') {
      this.snapshot.updated_at = new Date(changedData.updated_at)
    }

    assignIf(changedData, 'parentFlowId', (parentFlowId) => {
      this.parentFlowId = parentFlowId
    })
    assignIf(changedData, 'childFlowIds', (childFlowIds) => {
      this.childFlowIds = childFlowIds
    })
    assignIf(changedData, 'childNodeIds', (childNodeIds) => {
      this.childNodeIds = childNodeIds
    })
    assignIf(changedData, 'data', (data) => {
      assignIf(data, 'title', (title) => {
        this.title = title
      })
    })

    return this
  }

  //
  // api
  //
  async createChildFlow(flow: Flow) {
    const createdFlow = await this.store.createFlow({
      flow,
    })
    await this.store.updateFlow({
      flowId: this.id,
      changedFlow: {
        childFlowIds: [...(this.snapshot.childFlowIds ?? []), createdFlow.id],
      },
    })
  }
  async createChildNode(node: NodeTypes) {
    const createdNode = await this.store.rootStore.nodeStore.createNode(node)
    await this.store.updateFlow({
      flowId: this.id,
      changedFlow: {
        childNodeIds: [...(this.snapshot.childNodeIds ?? []), createdNode.id],
      },
    })
  }
}
