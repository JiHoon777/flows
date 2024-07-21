import { KanbanBoard } from '@/components/kanban/kanban.tsx'
import { DoNode } from '@/store/node/do-node.ts'

export const KanbanNodeDetailView = ({ node }: { node: DoNode }) => {
  return (
    <div>
      <KanbanBoard />
    </div>
  )
}
