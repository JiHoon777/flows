import { cloneDeep } from 'lodash-es'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { fileSystemAPI } from '@/api/file-system.ts'
import { DoNode } from '@/store/node/do-node.ts'
import { RootStore } from '@/store/root-store.ts'
import { Flow, NodeDataTypes, NodeTypes } from '@/store/types.ts'

export class DoNodeStore {
  rootStore: RootStore

  nodesMap: Record<string, DoNode> = {}

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore
    makeObservable(this, {
      nodesMap: observable,

      merge: action,
    })
  }

  //
  // getter
  //
  getNodeById(nodeId: string) {
    return this.nodesMap[nodeId]
  }

  //
  // action
  //
  merge(data: NodeTypes) {
    const existing = this.nodesMap[data.nodeId]

    if (!existing) {
      this.nodesMap[data.nodeId] = new DoNode(this, data)
      return this.nodesMap[data.nodeId]
    }

    return existing.merge(data)
  }

  //
  // api
  //
  async createNode(node: NodeTypes): Promise<DoNode> {
    const createdNode = this.merge(node)

    try {
      await fileSystemAPI.saveNodeToFile(node)
      return createdNode
    } catch (ex) {
      runInAction(() => {
        delete this.nodesMap[node.nodeId]
      })

      throw ex
    }
  }

  async updateNode({
    nodeId,
    changedNode,
  }: {
    nodeId: string
    changedNode: Partial<Omit<Flow, 'data'>> & {
      data?: Partial<NodeDataTypes>
    }
  }): Promise<DoNode> {
    const existing = this.nodesMap[nodeId]

    if (!existing) {
      throw new Error('could not find node')
    }

    const dataBeforeMerge = cloneDeep(existing.data)
    existing.merge(changedNode)

    try {
      await fileSystemAPI.saveNodeToFile(existing.data)

      return existing
    } catch (ex) {
      existing.merge(dataBeforeMerge)
      throw ex
    }
  }
}
