import { merge } from 'lodash-es'
import { action, computed, makeObservable, observable } from 'mobx'

import { DoFlowStore } from '@/store/flow/do-flow-store.ts'
import { FlowDrawer } from '@/store/flow/flow-drawer.ts'
import { Flow, FlowNodeData, NodeTypes } from '@/store/types.ts'

export class DoFlow {
  store: DoFlowStore
  drawer: FlowDrawer

  data!: Flow

  constructor(store: DoFlowStore, data: Flow) {
    this.store = store
    this.drawer = new FlowDrawer(this)

    this.merge(data)
    makeObservable(this, {
      data: observable,

      title: computed,
      parentFlowId: computed,
      childFlowIds: computed,
      childNodeIds: computed,

      merge: action,
    })
  }

  get id() {
    return this.data.flowId
  }

  get title() {
    return this.data.data?.title
  }

  get parentFlowId() {
    return this.data.parentFlowId
  }

  get childFlowIds() {
    return this.data.childFlowIds ?? []
  }

  get childNodeIds() {
    return this.data.childNodeIds ?? []
  }

  merge(
    data: Partial<Omit<Flow, 'data'>> & {
      data?: Partial<FlowNodeData>
    },
  ) {
    this.data = merge({}, this.data, data)

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
        childFlowIds: [...(this.data.childFlowIds ?? []), createdFlow.id],
      },
    })
  }
  async createChildNode(node: NodeTypes) {
    const createdNode = await this.store.rootStore.nodeStore.createNode(node)
    await this.store.updateFlow({
      flowId: this.id,
      changedFlow: {
        childNodeIds: [...(this.data.childNodeIds ?? []), createdNode.id],
      },
    })
  }
}
