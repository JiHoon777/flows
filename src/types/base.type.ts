export interface EditableItemBase {
  created_at: Date
  updated_at: Date
  isTrashed?: boolean
}

/**
 * Edge Data
 **/
export interface ReactFlowNodeTarget {
  id: string
  label?: string
}

export interface ReactFlowNodeBase {
  targets?: ReactFlowNodeTarget[]
  parentFlowId?: string | null

  position?: {
    x: number
    y: number
  }
  style?: {
    width: number
    height: number
  }
}

export type NodeType = 'text' | 'note' | 'table' | 'kanban'
export type ReactFlowNodeType = NodeType | 'flow'

export interface NodeBase<DATA_TYPE>
  extends EditableItemBase,
    ReactFlowNodeBase {
  data: DATA_TYPE
  nodeId: string
  type: NodeType
}

//
// Common Node Data
//
export interface CommonNodeData {
  title: string
}
