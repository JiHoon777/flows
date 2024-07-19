//
// Flow Node
//
import {
  CommonNodeData,
  EditableItemBase,
  ReactFlowNodeBase,
} from '@/types/base.type.ts'

export interface FlowNodeData extends CommonNodeData {}

//
// Flow 는 루트 Flow 를 제외하고 노드가 될 수 있다.
//
export interface Flow extends EditableItemBase, ReactFlowNodeBase {
  flowId: string
  data: FlowNodeData

  childNodeIds?: string[]
  childFlowIds?: string[]
}
