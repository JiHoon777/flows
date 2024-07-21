import { action, makeObservable, observable } from 'mobx'

import { DoNodeStore } from '@/store/node/do-node-store.ts'
import { assignIf } from '@/store/utils/store.utils.ts'
import { NodeType } from '@/types/base.type.ts'
import { NodeTypes } from '@/types/types.ts'
import { customMerge } from '@/utils/custom-merge.ts'

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

  merge(changedData: Partial<NodeTypes>) {
    this.snapshot = customMerge(this.snapshot, changedData)

    if (typeof changedData.created_at === 'string') {
      this.snapshot.created_at = new Date(changedData.created_at)
    }
    if (typeof changedData.updated_at === 'string') {
      this.snapshot.updated_at = new Date(changedData.updated_at)
    }

    assignIf(changedData, 'type', (type) => {
      this.type = type
    })
    assignIf(changedData, 'parentFlowId', (parentFlowId) => {
      this.parentFlowId = parentFlowId
    })
    assignIf(changedData, 'title', (title) => {
      this.title = title
    })

    return this
  }
}
