//
// Flow Node
//
import { EditableItemBase, ReactFlowNodeBase } from '@/types/base.type.ts'

//
// Flow 는 루트 Flow 를 제외하고 노드가 될 수 있다.
//
export interface Flow extends EditableItemBase, ReactFlowNodeBase {
  flowId: string
  title: string

  childNodeIds?: string[]
  childFlowIds?: string[]
}
