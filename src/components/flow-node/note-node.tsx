import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { NoteNodeData } from '@/types/note-node.type.ts'

export const NoteNode = observer((props: NodeProps<NoteNodeData>) => {
  const { data } = props

  return (
    <NodeWrap {...props} type={'note'}>
      <LexicalEditor
        initialEditorState={data.content ?? null}
        onChange={() => null}
        editable={false}
      />
    </NodeWrap>
  )
})
