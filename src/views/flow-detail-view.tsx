import type { DoFlow } from '@/store/flow/do-flow.ts'

import 'reactflow/dist/style.css'

import { observer } from 'mobx-react'
import { useParams } from 'react-router-dom'
import { ReactFlowProvider } from 'reactflow'

import { useStore } from '@/store/useStore.ts'
import { FlowReactFlowView } from '@/views/flow-detail-view/flow-react-flow-view.tsx'

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
  // const [viewType] = useState<'reactFlow' | 'kanban'>('kanban')

  return (
    <div className={'relative h-screen w-full'}>
      <FlowReactFlowView flow={flow} />
    </div>
  )
})
