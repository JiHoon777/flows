import { useState } from 'react'

import { observer } from 'mobx-react'
import { useParams } from 'react-router-dom'
import { ReactFlowProvider } from 'reactflow'

import { Switch } from '@/components/switch.tsx'
import { Button } from '@/components/ui/button.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'
import { FlowKanbanView } from '@/views/flow-detail-view/flow-kanban-view.tsx'
import { FlowReactFlowView } from '@/views/flow-detail-view/flow-react-flow-view.tsx'

import 'reactflow/dist/style.css'

export const FlowDetailViewParamsWrap = observer(() => {
  const store = useStore()
  const { flowId } = useParams<{ flowId: string }>()

  const flow = store.flowStore.getFlowById(flowId ?? '-1')

  if (!flow) {
    return null
  }

  return (
    <ReactFlowProvider>
      <FlowDetailView flow={flow} />
    </ReactFlowProvider>
  )
})

const FlowDetailView = observer(({ flow }: { flow: DoFlow }) => {
  const [viewType, setViewType] = useState<'reactFlow' | 'kanban'>('reactFlow')

  return (
    <div className={'relative h-screen w-full'}>
      <div className={'absolute left-4 top-4 z-10 flex gap-2'}>
        <Button onClick={() => setViewType('reactFlow')}>Flow View</Button>
        <Button onClick={() => setViewType('kanban')}>Kanban View</Button>
      </div>
      <Switch is={viewType}>
        <Switch.Case is={'reactFlow'}>
          <FlowReactFlowView flow={flow} />
        </Switch.Case>
        <Switch.Case is={'kanban'}>
          <FlowKanbanView flow={flow} />
        </Switch.Case>
      </Switch>
    </div>
  )
})
