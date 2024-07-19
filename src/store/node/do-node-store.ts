import { Effect, pipe } from 'effect'
import { cloneDeep } from 'lodash-es'
import { action, makeObservable, observable, runInAction } from 'mobx'

import { AppError } from '@/api/error.ts'
import { DoNode } from '@/store/node/do-node.ts'
import { RootStore } from '@/store/root-store.ts'
import { Flow } from '@/types/flow.type.ts'
import { NodeDataTypes, NodeTypes } from '@/types/types.ts'

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
  createNode(node: NodeTypes): Effect.Effect<DoNode, AppError> {
    const createdNode = this.merge(node)

    return pipe(
      this.rootStore.api.createNode(node),
      Effect.map(() => createdNode),
      Effect.catchAll((e) =>
        pipe(
          Effect.sync(() => {
            runInAction(() => {
              delete this.nodesMap[node.nodeId]
            })
          }),
          Effect.flatMap(() => Effect.fail(e)),
        ),
      ),
    )
  }

  updateNode({
    nodeId,
    changedNode,
  }: {
    nodeId: string
    changedNode: Partial<Omit<Flow, 'data'>> & {
      data?: Partial<NodeDataTypes>
    }
  }): Effect.Effect<DoNode, AppError> {
    const existing = this.nodesMap[nodeId]

    if (!existing) {
      throw new Error('could not find node')
    }

    const dataBeforeMerge = cloneDeep(existing.snapshot)
    existing.merge(changedNode)

    return pipe(
      this.rootStore.api.updateNode(existing.snapshot),
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

  removeNode(nodeId: string): Effect.Effect<void, AppError> {
    const deletedNode = this.nodesMap[nodeId]
    runInAction(() => {
      delete this.nodesMap[nodeId]
    })

    return pipe(
      this.rootStore.api.deleteNode(nodeId),
      Effect.catchAll((e) =>
        pipe(
          Effect.sync(() => {
            runInAction(() => {
              this.nodesMap[nodeId] = deletedNode
            })
          }),
          Effect.flatMap(() => Effect.fail(e)),
        ),
      ),
    )
  }
}
