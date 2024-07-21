import { NodeBase } from '@/types/base.type.ts'

export interface KanbanNode extends NodeBase {
  type: 'kanban'
  title: string
}
