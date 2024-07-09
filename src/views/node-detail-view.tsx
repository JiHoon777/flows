import { observer } from 'mobx-react'
import { useParams } from 'react-router-dom'

import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
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

  // const handleChange = useCallback(
  //   (content: string) => {
  //     if (!node || node.type !== 'note' || node.data.content !== content) {
  //       return
  //     }
  //
  //     updateNode(node.nodeId, { data: { content } })
  //   },
  //   [node, updateNode],
  // )

  if (node?.type !== 'note') {
    return <div>{node?.type} 은 내용 편집을 지원하지 않습니다.</div>
  }

  return (
    <main className={'w-full h-screen overflow-y-auto'}>
      <div
        className={
          'max-w-[1024px] w-full min-h-full flex flex-col mx-auto gap-6 mb-6'
        }
      >
        {/* Meta Data; Title, Tag, ...*/}
        <header className={'flex flex-col gap-1 shrink-0'}>
          <h1 className={'font-bold text-2xl'}>{node.title}</h1>
        </header>
        <LexicalEditor
          initialEditorState={null}
          onChange={(v) => {
            return v
          }}
        />
      </div>
    </main>
  )
})
