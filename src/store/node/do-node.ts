import { merge } from 'lodash-es'
import { action, makeObservable, observable } from 'mobx'

import { DoNodeStore } from '@/store/node/do-node-store.ts'
import { NodeDataTypes, NodeType, NodeTypes } from '@/store/types.ts'
import { assignIf } from '@/store/utils/store.utils.ts'

export class DoNode {
  store: DoNodeStore

  // UI 렌더링 용이 아닌, 기존 인터페이스의 최신 데이터를 가지고 있는다.
  snapshot!: NodeTypes
  type!: NodeType
  title!: string
  parentFlowId: string | null = null

  constructor(store: DoNodeStore, data: NodeTypes) {
    this.store = store

    this.merge(data)
    makeObservable(this, {
      parentFlowId: observable,
      type: observable,
      title: observable,

      merge: action,
    })
  }

  get id() {
    return this.snapshot.nodeId
  }

  merge(
    changedData: Partial<Omit<NodeTypes, 'data'>> & {
      data?: Partial<NodeDataTypes>
    },
  ) {
    this.snapshot = merge({}, this.snapshot, changedData)

    assignIf(changedData, 'type', (type) => {
      this.type = type
    })
    assignIf(changedData, 'parentFlowId', (parentFlowId) => {
      this.parentFlowId = parentFlowId
    })
    assignIf(changedData, 'data', (cd) => {
      assignIf(cd, 'title', (title) => {
        this.title = title
      })
    })

    return this
  }
}
