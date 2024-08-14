export interface IEditableItemBase {
  created_at: Date
  updated_at: Date
  isTrashed?: boolean
}

/**
 * Edge Data
 **/
export interface IReactFlowNodeTarget {
  id: string
  label?: string
}

export interface IReactFlowNodeBase {
  targets?: IReactFlowNodeTarget[]
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

export type NodeType = 'text' | 'note'
export type ReactFlowNodeType = NodeType | 'flow'

export interface INodeBase extends IEditableItemBase, IReactFlowNodeBase {
  nodeId: string
  type: NodeType
}
