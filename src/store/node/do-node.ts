import { merge } from 'lodash-es'
import { action, computed, makeObservable, observable } from 'mobx'

import { DoNodeStore } from '@/store/node/do-node-store.ts'
import { NodeDataTypes, NodeTypes } from '@/store/types.ts'

export class DoNode {
  store: DoNodeStore

  // UI 렌더링 용이 아닌, 기존 인터페이스의 최신 데이터를 가지고 있는다.
  data!: NodeTypes

  constructor(store: DoNodeStore, data: NodeTypes) {
    this.store = store

    this.merge(data)
    makeObservable(this, {
      data: observable,

      type: computed,
      title: computed,
      parentFlowId: computed,

      merge: action,
    })
  }

  get id() {
    return this.data.nodeId
  }

  get type() {
    return this.data.type
  }

  get title() {
    return this.data.data?.title
  }

  get parentFlowId() {
    return this.data.parentFlowId
  }

  merge(
    data: Partial<Omit<NodeTypes, 'data'>> & {
      data?: Partial<NodeDataTypes>
    },
  ) {
    this.data = merge({}, this.data, data)

    return this
  }
}
