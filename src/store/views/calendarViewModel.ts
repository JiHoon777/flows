import type { DoNode } from '@/store/node/do-node.ts'
import type { RootStore } from '@/store/root-store.ts'
import type { INoteNode } from '@/types/note-node.type.ts'

import { computed, makeObservable } from 'mobx'

export class CalendarViewModel {
  rootStore: RootStore

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore

    makeObservable(this, {
      dailyDateNoteNodes: computed,
      datesOfDailyDateNodes: computed,
    })
  }

  get dailyDateNoteNodes(): DoNode[] {
    return Object.values(this.rootStore.nodeStore.nodesMap).filter(
      (node) => node.snapshot.type === 'note' && !!node.snapshot.dailyDate,
    )
  }

  get datesOfDailyDateNodes(): string[] {
    return this.dailyDateNoteNodes.map(
      (node) => (node.snapshot as INoteNode).dailyDate!,
    )
  }

  createDailyDateNode(content: string, currentDate: string): void {
    this.rootStore.nodeStore
      .createNode({
        content,
        dailyDate: currentDate,
        nodeId: currentDate,
        title: currentDate,
        type: 'note',
      })
      .catch((ex) => this.rootStore.showError(ex))
  }

  changeDailyDateNodeContent(nodeId: string, content: string): void {
    this.rootStore.nodeStore
      .updateNode({
        changedNode: {
          content,
        },
        nodeId: nodeId,
      })
      .catch((ex) => this.rootStore.showError(ex))
  }
}
