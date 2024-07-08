import { memo } from 'react'

import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { NoteNodeData } from '@/store/types'

export const NoteNode = memo((props: NodeProps<NoteNodeData>) => {
  return <NodeWrap {...props}></NodeWrap>
})
