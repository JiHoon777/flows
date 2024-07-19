import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { For } from '@/components/for.tsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { useStore } from '@/store/useStore.ts'
import { FlowNodeData } from '@/types/flow.type.ts'

export const FlowNode = observer((props: NodeProps<FlowNodeData>) => {
  const { id } = props
  const store = useStore()
  const flow = store.flowStore.getFlowById(id)

  return (
    <NodeWrap {...props} type={'flow'}>
      <div className={'w-full flex flex-col gap-2'}>
        <p className={'text-left w-full text-xs px-2 font-extralight'}>
          Cards: {(flow.childNodeIds ?? []).length}, Flow:{' '}
          {(flow.childFlowIds ?? []).length}
        </p>
        <div className={'w-full h-full flex flex-wrap gap-4'}>
          <For
            each={flow.childNodeIds ?? []}
            map={(nodeId) => store.nodeStore.getNodeById(nodeId)}
          >
            {(node) => (
              <Card key={node.id} className={'w-[10rem]'}>
                <CardHeader>
                  <CardTitle>{node.title}</CardTitle>
                </CardHeader>
              </Card>
            )}
          </For>
        </div>
      </div>
    </NodeWrap>
  )
})
