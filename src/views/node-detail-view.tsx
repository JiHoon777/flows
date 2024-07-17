import { useCallback, useEffect, useState } from 'react'

import { Effect } from 'effect'
import { observer } from 'mobx-react'
import { useParams } from 'react-router-dom'

import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { BookLoading } from '@/components/loading/book-loading.tsx'
import { NoteNodeData } from '@/store/types.ts'
import { useStore } from '@/store/useStore.ts'

export const NodeDetailViewParamsWrap = observer(() => {
  const { nodeId } = useParams<{ nodeId: string }>()

  if (!nodeId) {
    throw new Error(`노드가 존재하지 않습니다.`)
  }

  return <NodeDetailView nodeId={nodeId} />
})

export const NodeDetailView = observer(({ nodeId }: { nodeId: string }) => {
  const store = useStore()
  const node = store.nodeStore.getNodeById(nodeId)
  const [isNodeChanging, setIsNodeChanging] = useState(false)

  const handleChange = useCallback(
    (v: string) => {
      Effect.runPromise(
        node.store.updateNode({
          nodeId: node.id,
          changedNode: {
            data: {
              content: v,
            },
          },
        }),
      ).catch((ex) => store.showError(ex))
    },
    [node.id, node.store],
  )

  useEffect(() => {
    setIsNodeChanging(true)

    const timeout = setTimeout(() => setIsNodeChanging(false), 100)

    return () => clearTimeout(timeout)
  }, [nodeId])

  if (isNodeChanging) {
    return <BookLoading />
  }

  if (node?.type !== 'note') {
    return <div>{node?.type} 은 내용 편집을 지원하지 않습니다.</div>
  }

  return (
    <main className={'w-full h-screen overflow-y-auto'}>
      <div
        className={
          'max-w-[1024px] w-full flex flex-col mx-auto gap-6 mt-10 mb-6'
        }
      >
        {/* Meta Data; Title, Tag, ...*/}
        <header className={'flex flex-col gap-1 shrink-0'}>
          <h1 className={'font-bold text-2xl'}>{node.title}</h1>
        </header>
        <LexicalEditor
          showTreeView={false}
          initialEditorState={
            (node.snapshot.data as NoteNodeData)?.content ?? null
          }
          onChange={handleChange}
        />
      </div>
    </main>
  )
})
