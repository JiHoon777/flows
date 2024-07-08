import { memo } from 'react'

import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { FlowNodeData } from '@/store/types'

export const FlowNode = memo((props: NodeProps<FlowNodeData>) => {
  return <NodeWrap {...props}></NodeWrap>
})
