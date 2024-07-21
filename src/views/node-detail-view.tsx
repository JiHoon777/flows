import { ChangeEvent, useCallback } from 'react'

import { Effect } from 'effect'
import { observer } from 'mobx-react'
import { useParams } from 'react-router-dom'

import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'
import { Switch } from '@/components/switch.tsx'
import { useDebounce } from '@/hooks/use-debounce.ts'
import { DoNode } from '@/store/node/do-node.ts'
import { useStore } from '@/store/useStore.ts'
import { KanbanNodeDetailView } from '@/views/node-detail-view/kanban-node-detail-view.tsx'
import { NoteNodeDetailView } from '@/views/node-detail-view/note-node-detail-view.tsx'
import { TableNodeDetailView } from '@/views/node-detail-view/table-node-detail-view.tsx'

export const NodeDetailViewParamsWrap = observer(() => {
  const store = useStore()
  const { nodeId } = useParams<{ nodeId: string }>()

  const node = store.nodeStore.getNodeById(nodeId ?? '-1')

  if (!node) {
    return null
  }

  return <NodeDetailView node={node} />
})

export const NodeDetailView = observer(({ node }: { node: DoNode }) => {
  const store = useStore()

  const changeTitle = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      Effect.runPromise(
        node.store.updateNode({
          nodeId: node.id,
          changedNode: {
            title: e.target.value,
          },
        }),
      ).catch((ex) => store.showError(ex))
    },
    [node.id, node.store, store],
  )
  const handleChangeTitle = useDebounce(changeTitle, 300)

  console.log(node.type)
  return (
    <main className={'h-screen w-full overflow-y-auto'}>
      <div
        className={
          'mx-auto mb-6 mt-10 flex w-full max-w-[1024px] flex-col gap-3'
        }
      >
        {/* Meta Data; Title, Tag, ...*/}
        <header className={'flex shrink-0 flex-col gap-1'}>
          <FlTextareaAutoSize
            className={
              'resize-none border-none text-6xl font-bold shadow-none focus-visible:ring-0'
            }
            defaultValue={node.title}
            onChange={handleChangeTitle}
          />
        </header>
        <Switch is={node.type}>
          <Switch.Case is={'note'}>
            <NoteNodeDetailView node={node} />
          </Switch.Case>
          <Switch.Case is={'kanban'}>
            <KanbanNodeDetailView node={node} />
          </Switch.Case>
          <Switch.Case is={'table'}>
            <TableNodeDetailView node={node} />
          </Switch.Case>
          <Switch.Default>
            지원되지 않는 타입입니다. type : {node.type}
          </Switch.Default>
        </Switch>
      </div>
    </main>
  )
})
