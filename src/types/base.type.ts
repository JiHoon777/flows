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

export interface NodeBase extends EditableItemBase, ReactFlowNodeBase {
  nodeId: string
  type: NodeType
}
