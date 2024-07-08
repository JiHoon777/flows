import { memo } from 'react'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { NoteNodeData } from '@/store/types'
import { NodeProps } from 'reactflow'

export const NoteNode = memo((props: NodeProps<NoteNodeData>) => {
  return <NodeWrap {...props}></NodeWrap>
})
