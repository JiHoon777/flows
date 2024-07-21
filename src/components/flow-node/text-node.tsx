import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'

export const TextNode = observer((props: NodeProps) => {
  return <NodeWrap {...props} type={'text'} />
})
