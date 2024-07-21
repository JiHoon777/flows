import { observer } from 'mobx-react'

import { KanbanBoard } from '@/components/kanban/kanban.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'

export const FlowKanbanView = observer(({ flow }: { flow: DoFlow }) => {
  console.log(7, flow)
  return (
    <div className={'h-full w-full overflow-y-auto pt-12'}>
      <KanbanBoard />
    </div>
  )
})
