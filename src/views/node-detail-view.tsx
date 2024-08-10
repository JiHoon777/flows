import type { DoNode } from '@/store/node/do-node.ts'
import type { ChangeEvent } from 'react'

import { observer } from 'mobx-react'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'

import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'
import { useDebounce } from '@/hooks/use-debounce.ts'
import { useStore } from '@/store/useStore.ts'
import { NoteNodeView } from '@/views/node-detail-view/note-node-view.tsx'

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
      node.store
        .updateNode({
          changedNode: {
            title: e.target.value,
          },
          nodeId: node.id,
        })
        .catch((ex) => store.showError(ex))
    },
    [node.id, node.store, store],
  )
  const handleChangeTitle = useDebounce(changeTitle, 300)

  return (
    <main className={'h-screen w-full overflow-y-auto scrollbar-hide'}>
      <div
        className={
          'mx-auto mb-6 mt-10 flex w-full max-w-screen-lg flex-col gap-3'
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
        <NoteNodeView node={node} />
      </div>
    </main>
  )
})
