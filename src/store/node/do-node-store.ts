import type { RootStore } from '@/store/root-store.ts'
import type { NodeTypes } from '@/types/types.ts'

import { cloneDeep } from 'lodash-es'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { DoNode } from '@/store/node/do-node.ts'

export class DoNodeStore {
  rootStore: RootStore

  nodesMap: Record<string, DoNode> = {}

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore
    makeObservable(this, {
      merge: action,

      nodesMap: observable,
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
  /**
   * @throws Error
   */
  async createNode(node: NodeTypes): Promise<DoNode> {
    const createdNode = this.merge(node)

    try {
      await this.rootStore.api.createNode(node)

      return createdNode
    } catch (ex) {
      runInAction(() => {
        delete this.nodesMap[node.nodeId]
      })
      throw ex
    }
  }

  /**
   * @returns DoNode
   * @throws Error
   */
  async updateNode({
    nodeId,
    changedNode,
  }: {
    nodeId: string
    changedNode: Partial<NodeTypes>
  }): Promise<DoNode> {
    const existing = this.nodesMap[nodeId]

    if (!existing) {
      throw new Error('could not find node')
    }

    const dataBeforeMerge = cloneDeep(existing.snapshot)
    existing.merge(changedNode)

    try {
      await this.rootStore.api.updateNode(existing.snapshot)

      return existing
    } catch (ex) {
      runInAction(() => {
        existing.merge(dataBeforeMerge)
      })

      throw ex
    }
  }

  async removeNode(nodeId: string): Promise<void> {
    const deletedNode = this.nodesMap[nodeId]
    runInAction(() => {
      delete this.nodesMap[nodeId]
    })

    try {
      await this.rootStore.api.deleteNode(nodeId)
    } catch (ex) {
      runInAction(() => {
        this.nodesMap[nodeId] = deletedNode
      })

      throw ex
    }
  }
}
