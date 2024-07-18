import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { FlowNodeData } from '@/store/types'

export const FlowNode = observer(
  (props: NodeProps<FlowNodeData> & { type: 'flow' }) => {
    return <NodeWrap {...props}></NodeWrap>
  },
)
