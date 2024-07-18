import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { NoteNodeData } from '@/store/types'

export const NoteNode = observer(
  (props: NodeProps<NoteNodeData> & { type: 'note' }) => {
    const { data } = props

    return (
      <NodeWrap {...props}>
        <LexicalEditor
          initialEditorState={data.content ?? null}
          onChange={() => null}
          editable={false}
        />
      </NodeWrap>
    )
  },
)
