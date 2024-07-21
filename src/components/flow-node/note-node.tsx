import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { useStore } from '@/store/useStore.ts'
import { INoteNode } from '@/types/note-node.type.ts'

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
