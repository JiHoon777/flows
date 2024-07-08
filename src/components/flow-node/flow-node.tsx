import { memo } from 'react'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { FlowNodeData } from '@/store/types'
import { NodeProps } from 'reactflow'

export const FlowNode = memo((props: NodeProps<FlowNodeData>) => {
  return <NodeWrap {...props}></NodeWrap>
})
