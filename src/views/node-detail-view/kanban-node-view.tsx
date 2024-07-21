import { KanbanBoard } from '@/components/kanban/kanban.tsx'
import { DoNode } from '@/store/node/do-node.ts'

export const KanbanNodeView = ({ node }: { node: DoNode }) => {
  console.log(node)
  return (
    <div>
      <KanbanBoard />
    </div>
  )
}
