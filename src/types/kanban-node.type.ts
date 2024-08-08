import type { INodeBase } from '@/types/base.type.ts'

export interface IKanbanNode extends INodeBase {
  type: 'kanban'
  title: string
}
