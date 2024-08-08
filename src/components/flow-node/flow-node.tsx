import type { NodeProps } from 'reactflow'

import { observer } from 'mobx-react'

import { NodeWrap } from '@/components/flow-node/node-wrap'
import { For } from '@/components/for.tsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn.ts'

const cns = {
  card: cn('w-[10rem]'),
  container: cn('flex w-full flex-col gap-2'),
  content: cn('flex h-full w-full flex-wrap gap-4'),
  desc: cn('w-full px-2 text-left text-xs font-extralight'),
}

export const FlowNode = observer((props: NodeProps) => {
  const { id } = props
  const store = useStore()
  const flow = store.flowStore.getFlowById(id)

  return (
    <NodeWrap {...props} type={'flow'}>
      <div className={cns.container}>
        <p className={cns.desc}>
          Cards: {(flow?.childNodeIds ?? []).length}, Flow:{' '}
          {(flow?.childFlowIds ?? []).length}
        </p>
        <div className={cns.content}>
          <For
            each={flow?.childNodeIds ?? []}
            map={(nodeId) => store.nodeStore.getNodeById(nodeId)}
          >
            {(node) => (
              <Card key={node.id} className={cns.card}>
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
