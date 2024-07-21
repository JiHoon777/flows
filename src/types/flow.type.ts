//
// Flow Node
//
import { IKanbanData } from '@/components/kanban/kanban.type.ts'
import { IEditableItemBase, IReactFlowNodeBase } from '@/types/base.type.ts'

//
// Flow 는 루트 Flow 를 제외하고 노드가 될 수 있다.
//
export interface IFlow extends IEditableItemBase, IReactFlowNodeBase {
  flowId: string
  title: string

  childNodeIds?: string[]
  childFlowIds?: string[]

  kanbanData?: IKanbanData
}
