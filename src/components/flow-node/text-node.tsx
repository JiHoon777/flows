import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { TextNodeData } from '@/types/text-node.type.ts'

export const TextNode = observer((props: NodeProps<TextNodeData>) => {
  return <NodeWrap {...props} type={'text'} />
})
