import { memo } from 'react'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { TextNodeData } from '@/store/types'
import { NodeProps } from 'reactflow'

export const TextNode = memo((props: NodeProps<TextNodeData>) => {
  return <NodeWrap {...props} />
})
