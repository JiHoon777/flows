import { useCallback, useEffect, useMemo } from 'react'

import { Effect } from 'effect'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { DoNode } from '@/store/node/do-node.ts'
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
  const navigate = useNavigate()
  const node: DoNode | undefined = store.nodeStore.getNodeById(nodeId)

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
    [node?.id, node?.store, store],
  )

  const initialEditorState = useMemo(() => {
    if (!node || node.snapshot.type !== 'note') {
      return null
    }

    return node.snapshot.data.content ?? null
  }, [node])

  useEffect(() => {
    if (!node) {
      navigate('/')
    }
  }, [navigate, node])

  if (node?.type !== 'note') {
    return <div>{node?.type} 은 내용 편집을 지원하지 않습니다.</div>
  }

  console.log(60, initialEditorState)

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
          initialEditorState={initialEditorState}
          onChange={handleChange}
        />
      </div>
    </main>
  )
})
