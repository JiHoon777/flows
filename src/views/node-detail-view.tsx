import { useCallback } from 'react'

import { LexicalEditor } from '@/components/lexical/lexical-editor'
import { useStore } from '@/store/store'
import { useParams } from 'react-router-dom'

export const NodeDetailView = () => {
  const { nodeId } = useParams<{ nodeId: string }>()
  const { node, updateNode } = useStore((state) => ({
    node: state.getNodeById(nodeId!),
    updateNode: state.updateNode,
  }))

  const handleChange = useCallback(
    (content: string) => {
      if (!node || node.type !== 'note' || node.data.content !== content) {
        return
      }

      updateNode(node.nodeId, { data: { content } })
    },
    [node, updateNode],
  )

  if (node?.type !== 'note') {
    return <div>{node?.type} 은 내용 편집을 지원하지 않습니다.</div>
  }

  return (
    <main
      className={
        'flex flex-col w-full h-full max-w-[1024px] mx-auto overflow-y-auto pt-10 gap-6'
      }
    >
      {/* Meta Data; Title, Tag, ...*/}
      <header className={'flex flex-col gap-1'}>
        <h1 className={'font-bold text-2xl'}>{node.data.title}</h1>
      </header>
      <LexicalEditor
        initialEditorState={node.data.content ?? null}
        onChange={handleChange}
      />
    </main>
  )
}
