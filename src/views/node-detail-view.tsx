import { ChangeEvent, useCallback, useEffect, useMemo } from 'react'

import { Effect } from 'effect'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'
import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { useDebounce } from '@/hooks/use-debounce.ts'
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

  const changeTitle = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      Effect.runPromise(
        node.store.updateNode({
          nodeId: node.id,
          changedNode: {
            data: {
              title: e.target.value,
            },
          },
        }),
      ).catch((ex) => store.showError(ex))
    },
    [node.id, node.store, store],
  )
  const handleChangeTitle = useDebounce(changeTitle, 300)

  const handleChangeContent = useCallback(
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
        <LexicalEditor
          showTreeView={false}
          initialEditorState={initialEditorState}
          onChange={handleChangeContent}
        />
      </div>
    </main>
  )
})
