import { memo } from 'react'

import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { TextNodeData } from '@/store/types'

export const TextNode = memo((props: NodeProps<TextNodeData>) => {
  return <NodeWrap {...props} />
})
