import { Effect } from 'effect'
import { computed, makeObservable, observable, runInAction } from 'mobx'
import { nanoid } from 'nanoid'

import { DoFlow } from '@/store/flow/do-flow.ts'
import { DoNode } from '@/store/node/do-node.ts'
import { RootStore } from '@/store/root-store.ts'

export enum ExplorerSortOption {
  CreatedTimeAsc = 'CreatedTimeAsc',
  CreatedTimeDesc = 'CreatedTimeDesc',
  UpdatedTimeAsc = 'UpdatedTimeAsc',
  UpdatedTimeDesc = 'UpdatedTimeDesc',
  TitleAtoZ = 'TitleAtoZ',
  TitleZtoA = 'TitleZtoA',
}

export class ExplorerView {
  rootStore: RootStore

  sortOption: ExplorerSortOption = ExplorerSortOption.CreatedTimeAsc
  isExpandAll: boolean = false
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore

    makeObservable(this, {
      sortOption: observable,
      isExpandAll: observable,

      explorerList: computed,
    })
  }

  //
  // get
  //
  get flowStore() {
    return this.rootStore.flowStore
  }

  get explorerList() {
    return ExplorerView.sortFlowsOrNodesBySortOption(
      [
        ...Object.values(this.flowStore.flowsMap).filter(
          (flow) => !flow.parentFlowId,
        ),
        ...Object.values(this.rootStore.nodeStore.nodesMap).filter(
          (node) => !node.parentFlowId && node.type !== 'text',
        ),
      ],
      this.sortOption,
    )
  }

  //
  // action
  //
  createFlowOnRoot() {
    Effect.runPromise(
      this.flowStore.createFlow({
        flow: {
          flowId: nanoid(),
          created_at: new Date(),
          updated_at: new Date(),
          childNodeIds: [],
          title: 'Untitled',
        },
      }),
    ).catch((ex) => this.rootStore.showError(ex))
  }

  setSortOption(changedOption: ExplorerSortOption) {
    runInAction(() => {
      this.sortOption = changedOption
    })
  }

  toggleIsExpandAll() {
    runInAction(() => {
      this.isExpandAll = !this.isExpandAll
    })
  }

  //
  // utils
  //
  static sortFlowsOrNodesBySortOption(
    _items: (DoFlow | DoNode)[],
    sortOption: ExplorerSortOption,
  ) {
    const items = _items.slice()
    switch (sortOption) {
      case ExplorerSortOption.CreatedTimeAsc:
        return items.sort(
          (a, b) =>
            a.snapshot.created_at.getTime() - b.snapshot.created_at.getTime(),
        )
      case ExplorerSortOption.CreatedTimeDesc:
        return items.sort(
          (a, b) =>
            b.snapshot.created_at.getTime() - a.snapshot.created_at.getTime(),
        )
      case ExplorerSortOption.UpdatedTimeAsc:
        return items.sort(
          (a, b) =>
            a.snapshot.updated_at.getTime() - b.snapshot.updated_at.getTime(),
        )
      case ExplorerSortOption.UpdatedTimeDesc:
        return items.sort(
          (a, b) =>
            b.snapshot.updated_at.getTime() - a.snapshot.updated_at.getTime(),
        )
      case ExplorerSortOption.TitleAtoZ:
        return items.sort((a, b) => a.title.localeCompare(b.title))
      case ExplorerSortOption.TitleZtoA:
        return items.sort((a, b) => b.title.localeCompare(a.title))
      default: {
        return items
      }
    }
  }
  static convertChildFlowIdsToDoFlows(
    flowId: string,
    getFlowById: (id: string) => DoFlow | undefined,
  ): DoFlow[] {
    const flow = getFlowById(flowId)

    if (!flow) {
      return []
    }

    return (
      flow.childFlowIds?.map((id) => getFlowById(id)).filter((cf) => !!cf) ?? []
    )
  }
  static convertChildNodeIdsToDoNodes(
    flowId: string,
    getFlowById: (id: string) => DoFlow | undefined,
    getNodeById: (id: string) => DoNode | undefined,
  ): DoNode[] {
    const flow = getFlowById(flowId)

    if (!flow) {
      return []
    }

    return (flow.childNodeIds
      ?.map((id) => getNodeById(id))
      .filter((cn) => !!cn && cn.type !== 'text') ?? []) as DoNode[]
  }
}
