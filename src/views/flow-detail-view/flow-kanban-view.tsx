import { useCallback, useMemo } from 'react'

import { Effect } from 'effect'
import { observer } from 'mobx-react'
import { nanoid } from 'nanoid'

import { KanbanBoard } from '@/components/kanban/kanban.tsx'
import { IKanbanData } from '@/components/kanban/kanban.type.ts'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'

export const FlowKanbanView = observer(({ flow }: { flow: DoFlow }) => {
  const store = useStore()

  const handleUpdate = useCallback(
    (kanbanData: IKanbanData) => {
      Effect.runPromise(
        flow.store.updateFlow({
          flowId: flow.id,
          changedFlow: {
            kanbanData,
          },
        }),
      ).catch((ex) => store.showError(ex))
    },
    [flow.id, flow.store, store],
  )

  const kanbanData: IKanbanData = useMemo(() => {
    return (
      flow.snapshot.kanbanData ?? {
        columns: [
          { id: nanoid(), title: 'Inbox', cardIds: flow.childNodeIds ?? [] },
        ],
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
