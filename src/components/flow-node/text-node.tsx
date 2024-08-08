import type { NodeProps } from 'reactflow'

import { observer } from 'mobx-react'

import { NodeWrap } from '@/components/flow-node/node-wrap'

export const TextNode = observer((props: NodeProps) => {
  return <NodeWrap {...props} type={'text'} />
})
