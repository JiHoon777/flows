import type { INoteNode } from '@/types/note-node.type.ts'
import type { NodeProps } from 'reactflow'

import { observer } from 'mobx-react'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { useStore } from '@/store/useStore.ts'

export const NoteNode = observer((props: NodeProps) => {
  const { id } = props
  const store = useStore()
  const node = store.nodeStore.getNodeById(id)
  const noteNodeSnapshot = node?.snapshot as INoteNode | undefined

  return (
    <NodeWrap {...props} type={'note'}>
      <LexicalEditor
        initialEditorState={noteNodeSnapshot?.content ?? null}
        onChange={() => null}
        editable={false}
      />
    </NodeWrap>
  )
})
