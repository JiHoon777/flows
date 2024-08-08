import type { IKanbanData } from '@/components/kanban/kanban.type.ts'
import type { DoFlow } from '@/store/flow/do-flow.ts'

import { Effect } from 'effect'
import { observer } from 'mobx-react'
import { nanoid } from 'nanoid'
import { useCallback, useMemo } from 'react'

import { KanbanBoard } from '@/components/kanban/kanban.tsx'
import { useStore } from '@/store/useStore.ts'

export const FlowKanbanView = observer(({ flow }: { flow: DoFlow }) => {
  const store = useStore()

  const handleUpdate = useCallback(
    (kanbanData: IKanbanData) => {
      Effect.runPromise(
        flow.store.updateFlow({
          changedFlow: {
            kanbanData,
          },
          flowId: flow.id,
        }),
      ).catch((ex) => store.showError(ex))
    },
    [flow.id, flow.store, store],
  )

  const kanbanData: IKanbanData = useMemo(() => {
    return (
      flow.snapshot.kanbanData ?? {
        cards:
          flow.childNodeIds?.reduce(
            (prev, cur) => {
              const found = store.nodeStore.getNodeById(cur)

              if (!found) {
                return prev
              }

              prev[cur] = {
                id: cur,
                referenceId: cur,
              }

              return prev
            },
            {} as IKanbanData['cards'],
          ) ?? {},
        columns: [
          { cardIds: flow.childNodeIds ?? [], id: nanoid(), title: 'Inbox' },
        ],
      }
    )
  }, [flow, store.nodeStore])

  return (
    <div className={'h-full w-full overflow-auto pt-12'}>
      <KanbanBoard
        data={kanbanData}
        onChange={handleUpdate}
        renderCard={(card) => {
          const node = store.nodeStore.getNodeById(card.id)
          return <div className={'cursor-pointer'}>{node.title}</div>
        }}
      />
    </div>
  )
})
