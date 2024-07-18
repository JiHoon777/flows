import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { TextNodeData } from '@/store/types'

export const TextNode = observer(
  (props: NodeProps<TextNodeData> & { type: 'text' }) => {
    return <NodeWrap {...props} />
  },
)
