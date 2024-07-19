import { CommonNodeData, NodeBase } from '@/types/base.type.ts'

export interface KanbanNodeData extends CommonNodeData {}

export interface KanbanNode extends NodeBase<KanbanNodeData> {
  type: 'kanban'
}
